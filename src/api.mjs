import { forecastRecords } from './forecast.mjs';
const categories=['Tour package','Flight booking','Hotel reservation','Visa assistance'];
const roles=['Administrator','Booking staff','Accounting staff','Finance manager'];
const enc=new TextEncoder();
const uid=(prefix)=>prefix+'-'+crypto.randomUUID().slice(0,8).toUpperCase();
const now=()=>new Date().toISOString();
const day=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'});
function fail(message,status=400){throw Object.assign(new Error(message),{status})}
function str(value,label,max=180){if(typeof value!=='string'||!value.trim()||value.trim().length>max)fail(label+' is required (maximum '+max+' characters).');return value.trim()}
function email(v){const s=str(v,'Email',254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail('Enter a valid email address.');return s}
function money(value,label){const s=String(value);if(!/^\d+(\.\d{1,2})?$/.test(s))fail(label+' must be a non-negative amount with up to two decimal places.');const v=Math.round(Number(s)*100);if(!Number.isSafeInteger(v)||v>100000000000)fail(label+' is too large.');return v}
function date(v,label='Date'){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Enter a valid '+label.toLowerCase()+'.');return v}
function choice(v,options,label){if(!options.includes(v))fail('Choose a valid '+label+'.');return v}
async function passwordHash(password,salt=crypto.randomUUID()){if(typeof password!=='string'||password.length<10||password.length>128)fail('Use a password of 10 to 128 characters.');const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256);return salt+':'+Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('')}
async function matches(password,stored){try{const hashed=await passwordHash(password,stored.split(':')[0]);let difference=hashed.length^stored.length;for(let i=0;i<stored.length;i++)difference|=(hashed.charCodeAt(i)||0)^stored.charCodeAt(i);return difference===0}catch{return false}}
async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}
export async function handleApi(request,env){
 const DB=env.DB;const path=new URL(request.url).pathname;const method=request.method;
 const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
 const q=(sql,...args)=>DB.prepare(sql).bind(...args);const one=async(sql,...args)=>q(sql,...args).first();const all=async(sql,...args)=>(await q(sql,...args).all()).results;
 const cookie=(token,age=43200)=>'systema_session='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+age+(env.LOCAL?'':'; Secure');
 try {
  if(!DB)fail('Database is unavailable. Please try again later.',503);
  if(!['GET','HEAD'].includes(method)) {const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)fail('This request is not allowed.',403);if(!request.headers.get('content-type')?.includes('application/json'))fail('Send JSON data.',415);}
  const initialized=Boolean(await one('SELECT id FROM users LIMIT 1'));
  const rawCookie=(request.headers.get('cookie')||'').match(/(?:^|; )systema_session=([^;]+)/)?.[1];
  const user=rawCookie?await one('SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1',await digest(rawCookie),Date.now()):null;
  if(path==='/api/session'&&method==='GET')return json({initialized,user});
  let body={};if(!['GET','HEAD'].includes(method)){const text=await request.text();if(text.length>30000)fail('Request is too large.',413);try{body=JSON.parse(text)}catch{fail('Invalid request data.')};if(!body||Array.isArray(body)||typeof body!=='object')fail('Invalid request data.');}
  const login=async(id)=>{const token=crypto.randomUUID()+crypto.randomUUID();await DB.batch([q('DELETE FROM sessions WHERE expires<?',Date.now()),q('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',await digest(token),id,Date.now()+43200000)]);return json({ok:true},200,{'Set-Cookie':cookie(token)})};
  if(path==='/api/setup'&&method==='POST') {
   if(initialized)fail('The workspace has already been set up.',409);
   if(!env.LOCAL&&!request.headers.get('oai-authenticated-user-id'))fail('Sign in to your private site before creating the workspace.',401);
   const id=uid('USR');const name=str(body.name,'Name');const mail=email(body.email);const hash=await passwordHash(body.password);
   await DB.batch([q('INSERT INTO users(id,name,email,role,password,created) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM users)',id,name,mail,'Administrator',hash,now()),q('INSERT INTO settings(key,value) VALUES(?,?)','agency',str(body.agency,'Agency name')),q('INSERT INTO settings(key,value) VALUES(?,?)','demo',body.demo?'true':'false')]);
   if(body.demo)await seed(DB,id);
   return login(id);
  }
  if(path==='/api/login'&&method==='POST') {
   const mail=email(body.email);const key=await digest(mail);const time=Date.now(),windowStart=time-900000;
   const attempts=await one('SELECT * FROM auth_attempts WHERE key=?',key);if(attempts&&attempts.started>windowStart&&attempts.attempts>=5)fail('Too many sign-in attempts. Try again in 15 minutes.',429);
   await q('INSERT INTO auth_attempts(key,attempts,started) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN started<? THEN 1 ELSE attempts+1 END,started=CASE WHEN started<? THEN ? ELSE started END',key,time,windowStart,windowStart,time).run();
   const account=await one('SELECT * FROM users WHERE email=? AND active=1',mail);
   if(!account||!await matches(body.password,account.password))fail('Email or password is incorrect.',401);
   await q('DELETE FROM auth_attempts WHERE key=?',key).run();return login(account.id);
  }
  if(!user)fail('Please sign in to continue.',401);
  const allow=(...allowed)=>{if(!allowed.includes(user.role))fail('Your role does not have permission to perform this action.',403)};
  const audit=(action,id)=>q('INSERT INTO audit(id,user_id,action,entity_id,created) VALUES(?,?,?,?,?)',uid('LOG'),user.id,action,id,now());
  if(path==='/api/logout'&&method==='POST'){if(rawCookie)await q('DELETE FROM sessions WHERE token=?',await digest(rawCookie)).run();return json({ok:true},200,{'Set-Cookie':cookie('',0)})}
  if(path==='/api/forecast'&&method==='GET') {
   allow('Administrator','Accounting staff','Finance manager');
   const params=new URL(request.url).searchParams,metric=params.get('metric')||'sales',horizon=Number(params.get('horizon')||3),category=params.get('category')||'all';
   if(!['sales','collections','bookings'].includes(metric)||!Number.isInteger(horizon)||horizon<1||horizon>6)fail('Choose a valid metric and a horizon of 1 to 6 months.');
   if(category!=='all'&&!categories.includes(category))fail('Choose a valid service category.');
   const rows=metric==='collections'?await all('SELECT p.date,p.amount,b.category,b.status FROM payments p JOIN bookings b ON b.id=p.booking_id'):await all('SELECT date,total,category,status FROM bookings');
   const demo=await one('SELECT value FROM settings WHERE key=?','demo');
   return json(forecastRecords(rows.filter(row=>category==='all'||row.category===category),{metric,horizon,asOf:day(),demo:demo?.value==='true'}));
  }
  if(path==='/api/data'&&method==='GET') {
   const [customers,packages,bookings,payments,expenses,settings,users,audits]=await Promise.all([
    all('SELECT * FROM customers ORDER BY name'),all('SELECT * FROM packages ORDER BY name'),all('SELECT b.*,c.name customer_name,c.email customer_email,COALESCE((SELECT SUM(amount) FROM payments p WHERE p.booking_id=b.id),0) paid FROM bookings b JOIN customers c ON b.customer_id=c.id ORDER BY b.date DESC,b.rowid DESC'),all('SELECT p.*,b.service,c.name customer_name FROM payments p JOIN bookings b ON p.booking_id=b.id JOIN customers c ON b.customer_id=c.id ORDER BY p.date DESC,p.rowid DESC'),user.role==='Booking staff'?[]:all('SELECT * FROM expenses ORDER BY date DESC,rowid DESC'),all('SELECT * FROM settings'),user.role==='Administrator'?all('SELECT id,name,email,role,active,created FROM users ORDER BY name'):[],user.role==='Administrator'?all('SELECT a.*,u.name user_name FROM audit a JOIN users u ON a.user_id=u.id ORDER BY a.rowid DESC LIMIT 30'):[]
   ]);return json({user,customers,packages,bookings,payments,expenses,settings:Object.fromEntries(settings.map(s=>[s.key,s.value])),users,audits,categories,roles});
  }
  if(path==='/api/customers'&&method==='POST'){
   allow('Administrator','Booking staff');const id=body.id||uid('CUS');const name=str(body.name,'Customer name'),mail=email(body.email),phone=str(body.phone,'Phone number',40);
   if(body.id){if(!await one('SELECT id FROM customers WHERE id=?',id))fail('Customer not found.',404);await DB.batch([q('UPDATE customers SET name=?,email=?,phone=? WHERE id=?',name,mail,phone,id),audit('Updated customer',id)])}
   else await DB.batch([q('INSERT INTO customers(id,name,email,phone,created) VALUES(?,?,?,?,?)',id,name,mail,phone,now()),audit('Added customer',id)]);
   return json({id});
  }
  if(path==='/api/packages'&&method==='POST'){
   allow('Administrator','Booking staff');const id=body.id||uid('PKG'),name=str(body.name,'Service name'),destination=str(body.destination,'Destination'),category=choice(body.category,categories,'service category'),price=money(body.price,'Base price');
   if(body.id){if(!await one('SELECT id FROM packages WHERE id=?',id))fail('Service not found.',404);await DB.batch([q('UPDATE packages SET name=?,destination=?,category=?,price=?,active=? WHERE id=?',name,destination,category,price,body.active===false?0:1,id),audit('Updated service',id)])}
   else await DB.batch([q('INSERT INTO packages(id,name,destination,category,price,active) VALUES(?,?,?,?,?,1)',id,name,destination,category,price),audit('Added service',id)]);
   return json({id});
  }
  if(path==='/api/bookings'&&method==='POST'){
   allow('Administrator','Booking staff');const id=body.id||uid('BKG');const customer=str(body.customer_id,'Customer');if(!await one('SELECT id FROM customers WHERE id=?',customer))fail('Select an existing customer.');
   const packageId=body.package_id||null;if(packageId&&!await one('SELECT id FROM packages WHERE id=?',packageId))fail('Service not found.');
   const service=str(body.service,'Service'),destination=str(body.destination,'Destination'),category=choice(body.category,categories,'service category'),bookingDate=date(body.date,'Booking date'),travelDate=date(body.travel_date,'Travel date');
   if(bookingDate>day())fail('Booking date cannot be in the future.');if(travelDate<bookingDate)fail('Travel date cannot be before the booking date.');
   const passengers=Number(body.passengers);if(!Number.isInteger(passengers)||passengers<1||passengers>500)fail('Passengers must be between 1 and 500.');
   const base=money(body.base,'Base fare'),tax=money(body.tax,'Taxes'),discount=money(body.discount,'Discount'),cost=money(body.supplier_cost,'Supplier cost');const total=base+tax-discount;if(total<=0)fail('The total must be greater than zero.');
   const status=choice(body.status,['Pending','Confirmed','Completed','Cancelled'],'booking status');const notes=typeof body.notes==='string'?body.notes.slice(0,2000):'';
   const previous=body.id?await one('SELECT * FROM bookings WHERE id=?',id):null;if(body.id&&!previous)fail('Booking not found.',404);
   if(previous){const result=await DB.batch([q('UPDATE bookings SET customer_id=?,package_id=?,service=?,destination=?,category=?,date=?,travel_date=?,passengers=?,base=?,tax=?,discount=?,supplier_cost=?,total=?,status=?,notes=? WHERE id=? AND COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id=?),0)<=? AND (?!=\'Cancelled\' OR NOT EXISTS(SELECT 1 FROM payments WHERE booking_id=?)) AND (NOT EXISTS(SELECT 1 FROM payments WHERE booking_id=?) OR (customer_id=? AND category=? AND service=? AND base=? AND tax=? AND discount=?))',customer,packageId,service,destination,category,bookingDate,travelDate,passengers,base,tax,discount,cost,total,status,notes,id,id,total,status,id,id,customer,category,service,base,tax,discount),q('INSERT INTO audit(id,user_id,action,entity_id,created) SELECT ?,?,?,?,? WHERE changes()>0',uid('LOG'),user.id,'Updated booking',id,now())]);if(!result[0].meta.changes)fail('Paid bookings cannot change their customer or fare, or be cancelled. Create a separate adjustment outside this version.',409);}
   else {if(status==='Cancelled')fail('New bookings cannot start cancelled.');await DB.batch([q('INSERT INTO bookings(id,customer_id,package_id,service,destination,category,date,travel_date,passengers,base,tax,discount,supplier_cost,total,status,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,customer,packageId,service,destination,category,bookingDate,travelDate,passengers,base,tax,discount,cost,total,status,notes,user.id),audit('Created booking',id)]);}
   return json({id});
  }
  if(path==='/api/payments'&&method==='POST'){
   allow('Administrator','Booking staff','Accounting staff');const requestId=str(body.request_id,'Request identifier',100);const duplicate=await one('SELECT id FROM payments WHERE request_id=?',requestId);if(duplicate)return json({id:duplicate.id});
   const id=uid('RCT'),booking=str(body.booking_id,'Booking'),amount=money(body.amount,'Payment'),paymentDate=date(body.date,'Payment date'),paymentMethod=choice(body.method,['Cash','Bank transfer','GCash','Card (record only)'],'payment method'),reference=typeof body.reference==='string'?body.reference.trim().slice(0,180):'';
   if(amount<=0)fail('Payment must be greater than zero.');if(paymentDate>day())fail('Payment date cannot be in the future.');
   const b=await one('SELECT * FROM bookings WHERE id=?',booking);if(!b)fail('Booking not found.',404);if(paymentDate<b.date)fail('Payment date cannot be before booking date.');
   const result=await DB.batch([q('INSERT INTO payments(id,booking_id,amount,date,method,reference,created_by,request_id) SELECT ?,?,?,?,?,?,?,? FROM bookings b WHERE b.id=? AND b.status!=\'Cancelled\' AND b.total-COALESCE((SELECT SUM(amount) FROM payments p WHERE p.booking_id=b.id),0)>=?',id,booking,amount,paymentDate,paymentMethod,reference,user.id,requestId,booking,amount),q('INSERT INTO audit(id,user_id,action,entity_id,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM payments WHERE id=?)',uid('LOG'),user.id,'Recorded payment',id,now(),id)]);
   if(!result[0].meta.changes)fail('Payment exceeds the current balance or the booking is cancelled.',409);return json({id});
  }
  if(path==='/api/expenses'&&method==='POST'){
   allow('Administrator','Accounting staff');const requestId=str(body.request_id,'Request identifier',100);const duplicate=await one('SELECT id FROM expenses WHERE request_id=?',requestId);if(duplicate)return json({id:duplicate.id});const id=uid('EXP'),description=str(body.description,'Description'),category=choice(body.category,['Supplier payment','Rent','Utilities','Marketing','Salaries','Transport','Other'],'expense category'),amount=money(body.amount,'Expense'),expenseDate=date(body.date,'Expense date'),payee=str(body.payee,'Payee'),bookingId=body.booking_id||null;
   if(amount<=0)fail('Expense must be greater than zero.');if(expenseDate>day())fail('Expense date cannot be in the future.');if(bookingId&&!await one('SELECT id FROM bookings WHERE id=?',bookingId))fail('Booking not found.');if(category==='Supplier payment'&&!bookingId)fail('Link supplier payments to a booking.');
   await DB.batch([q('INSERT INTO expenses(id,description,category,amount,date,payee,booking_id,created_by,request_id) VALUES(?,?,?,?,?,?,?,?,?)',id,description,category,amount,expenseDate,payee,bookingId,user.id,requestId),audit('Recorded expense',id)]);return json({id});
  }
  if(path==='/api/users'&&method==='POST'){
   allow('Administrator');const id=body.id||uid('USR');const name=str(body.name,'Name'),mail=email(body.email),role=choice(body.role,roles,'role');const active=body.active===false?0:1;
   if(body.id){const existing=await one('SELECT * FROM users WHERE id=?',id);if(!existing)fail('User not found.',404);if(id===user.id&&(role!=='Administrator'||!active))fail('You cannot remove your own administrator access.');const hash=body.password?await passwordHash(body.password):existing.password;await DB.batch([q('UPDATE users SET name=?,email=?,role=?,active=?,password=? WHERE id=?',name,mail,role,active,hash,id),q('DELETE FROM sessions WHERE user_id=?',id),audit('Updated staff account',id)]);}
   else {const hash=await passwordHash(body.password);await DB.batch([q('INSERT INTO users(id,name,email,role,password,active,created) VALUES(?,?,?,?,?,?,?)',id,name,mail,role,hash,active,now()),audit('Created staff account',id)]);}
   return json({id});
  }
  fail('Endpoint not found.',404);
 }catch(error){if(error.status)return json({error:error.message},error.status);if(/UNIQUE constraint|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message))return json({error:'This email or transaction already exists.'},409);console.error('Systema request failed:',error.message);return json({error:'Unable to save or load records. Your input has been kept. Please try again.'},503)}
}
async function seed(DB,userId){
 const q=(s,...a)=>DB.prepare(s).bind(...a);const statements=[];
 const customers=[['CUS-DEMO01','Isabel Santos','isabel@example.com','0917 555 0101'],['CUS-DEMO02','Miguel Reyes','miguel@example.com','0917 555 0102'],['CUS-DEMO03','Andrea Cruz','andrea@example.com','0917 555 0103'],['CUS-DEMO04','Rafael Garcia','rafael@example.com','0917 555 0104'],['CUS-DEMO05','Camille Torres','camille@example.com','0917 555 0105'],['CUS-DEMO06','Paolo Mendoza','paolo@example.com','0917 555 0106']];
 for(const c of customers)statements.push(q('INSERT INTO customers(id,name,email,phone,created) VALUES(?,?,?,?,?)',...c,now()));
 const packages=[['PKG-DEMO01','El Nido island escape','Palawan','Tour package',1850000],['PKG-DEMO02','Tokyo discovery','Tokyo, Japan','Tour package',6200000],['PKG-DEMO03','Manila to Singapore','Singapore','Flight booking',1450000],['PKG-DEMO04','Boracay beachfront stay','Boracay','Hotel reservation',980000],['PKG-DEMO05','Japan tourist visa','Japan','Visa assistance',250000],['PKG-DEMO06','Seoul city break','Seoul, South Korea','Tour package',4250000]];
 for(const p of packages)statements.push(q('INSERT INTO packages(id,name,destination,category,price,active) VALUES(?,?,?,?,?,1)',...p));
 const today=day();const anchor=new Date(today+'T12:00:00Z');
 for(let i=0;i<24;i++){const p=packages[i%6],c=customers[i%6];const dt=new Date(anchor);dt.setUTCDate(dt.getUTCDate()-(23-i)*7);const date=dt.toISOString().slice(0,10);const travel=new Date(dt);travel.setUTCDate(travel.getUTCDate()+35);const base=p[4]*(i%3===0?2:1),tax=Math.round(base*.03),discount=i%4===0?50000:0,total=base+tax-discount,status=i<16?'Completed':i%3===0?'Pending':'Confirmed',cost=Math.round(base*.74),id='BKG-DEMO'+String(i+1).padStart(2,'0');
 statements.push(q('INSERT INTO bookings(id,customer_id,package_id,service,destination,category,date,travel_date,passengers,base,tax,discount,supplier_cost,total,status,notes,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,c[0],p[0],p[1],p[2],p[3],date,travel.toISOString().slice(0,10),i%3===0?2:1,base,tax,discount,cost,total,status,'Illustrative sample record',userId));
 const amount=i>=20?Math.floor(total/2):total;statements.push(q('INSERT INTO payments(id,booking_id,amount,date,method,reference,created_by,request_id) VALUES(?,?,?,?,?,?,?,?)','RCT-DEMO'+String(i+1).padStart(2,'0'),id,amount,date,i%2?'Bank transfer':'Cash','SAMPLE-'+(i+1),userId,'sample-payment-'+i));
 statements.push(q('INSERT INTO expenses(id,description,category,amount,date,payee,booking_id,created_by,request_id) VALUES(?,?,?,?,?,?,?,?,?)','EXP-DEMO'+String(i+1).padStart(2,'0'),p[1]+' supplier settlement','Supplier payment',cost,date,'Sample travel supplier',id,userId,'sample-expense-'+i));
 }
 statements.push(q('INSERT INTO expenses(id,description,category,amount,date,payee,booking_id,created_by,request_id) VALUES(?,?,?,?,?,?,?,?,?)','EXP-DEMORENT','Office rent','Rent',1800000,today,'Sample property owner',null,userId,'sample-rent'));
 await DB.batch(statements);
}
