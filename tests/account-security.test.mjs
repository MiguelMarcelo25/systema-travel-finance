import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from '../src/api.mjs';
import { openDatabase } from '../src/database.mjs';
import { tokenDigest } from '../src/account-security.mjs';

const password = 'Account-test-password-2026';
function fixture(t) {
  const DB = openDatabase(':memory:'); t.after(()=>DB.close()); const messages=[];
  const env={DB,LOCAL:true,APP_URL:'http://localhost:4173',CLIENT_IP:'security-test',MAIL:{async send(message){messages.push(message);}}};
  const call=async(path,data,cookie='',overrides={})=>{const response=await handleApi(new Request('http://localhost:4173/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:data?JSON.stringify(data):undefined}),{...env,...overrides});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
  const token=()=>new URLSearchParams(new URL(messages.at(-1).text.match(/http:\/\/\S+/)[0]).hash.slice(1)).get('token');
  return {DB,env,call,messages,token};
}
test('administrator and client verification gates cannot be bypassed; tokens are private, purpose-bound and single-use',async t=>{
  const {DB,call,messages,token}=fixture(t);
  const admin=await call('login',{email:'admin@example.test',password});assert.equal(admin.status,200);
  assert.equal((await call('data',null,admin.cookie)).status,403);
  assert.equal((await call('packages',{name:'blocked'},admin.cookie)).status,403);
  const verifyToken=token();assert.ok(!JSON.stringify(admin).includes(verifyToken));
  const saved=await DB.prepare('SELECT * FROM account_tokens').first();assert.equal(saved.token_hash,await tokenDigest(verifyToken));assert.notEqual(saved.token_hash,verifyToken);
  assert.equal((await call('reset-password',{token:verifyToken,password,confirm_password:password})).status,400);
  assert.equal((await call('verify-email',{token:verifyToken})).status,200);
  assert.equal((await call('verify-email',{token:verifyToken})).status,400);
  assert.equal((await call('data',null,admin.cookie)).status,200);
  const client=await call('register',{name:'Client',email:'client@example.test',phone:'12345',password,confirm_password:password});
  assert.equal(client.status,200);assert.equal((await call('data',null,client.cookie)).status,403);
  assert.equal((await call('resend-verification',{})).status,401);
  const old=token();assert.equal((await call('resend-verification',{},client.cookie)).status,200);
  assert.notEqual(token(),old);assert.equal((await call('verify-email',{token:old})).status,400);
  assert.equal((await call('verify-email',{token:token()})).status,200);
  assert.equal((await call('data',null,client.cookie)).data.user.role,'Client');
  assert.equal((await call('package-forecast',null,client.cookie)).status,403);
  assert.equal(messages.length,3);
});
test('password recovery works for both roles, hides account existence, expires links and invalidates sessions',async t=>{
  const {DB,call,messages,token}=fixture(t);
  const admin=await call('login',{email:'admin@example.test',password});await call('verify-email',{token:token()});
  const client=await call('register',{name:'Client',email:'client@example.test',phone:'12345',password,confirm_password:password});await call('verify-email',{token:token()});
  const unknown=await call('forgot-password',{email:'missing@example.test'});const before=messages.length;
  for(const [email,cookie] of [['admin@example.test',admin.cookie],['client@example.test',client.cookie]]){
    const known=await call('forgot-password',{email});assert.deepEqual(known,unknown);const resetToken=token();
    assert.equal((await call('verify-email',{token:resetToken})).status,400);
    assert.equal((await call('reset-password',{token:resetToken,password:'short',confirm_password:'short'})).status,400);
    const changed='Changed-test-password-2026';
    assert.equal((await call('reset-password',{token:resetToken,password:changed,confirm_password:changed})).status,200);
    assert.equal((await call('data',null,cookie)).status,401);
    assert.equal((await call('reset-password',{token:resetToken,password:changed,confirm_password:changed})).status,400);
    assert.equal((await call('login',{email,password})).status,401);
    assert.equal((await call('login',{email,password:changed})).status,200);
  }
  assert.equal(messages.length,before+2);
  await call('forgot-password',{email:'client@example.test'});const expired=token();await DB.prepare('UPDATE account_tokens SET expires=0').run();
  assert.equal((await call('reset-password',{token:expired,password,confirm_password:password})).status,400);
});
test('recovery rate limits survive requests and mail failures do not enumerate accounts',async t=>{
  const {call}=fixture(t);await call('login',{email:'admin@example.test',password});
  const broken={MAIL:{async send(){throw Error('provider outage');}}};
  const known=await call('forgot-password',{email:'admin@example.test'},'',broken),unknown=await call('forgot-password',{email:'unknown@example.test'},'',broken);
  assert.deepEqual(known,unknown);
  for(let i=0;i<4;i++)assert.equal((await call('forgot-password',{email:'unknown@example.test'})).status,200);
  assert.equal((await call('forgot-password',{email:'unknown@example.test'})).status,429);
  assert.equal((await call('forgot-password',{email:'different@example.test'},'',{MAIL:undefined})).status,503);
});
test('changing an account email invalidates verification and outstanding reset links',async t=>{
  const {call,token}=fixture(t);const admin=await call('login',{email:'admin@example.test',password});await call('verify-email',{token:token()});
  const customer=await call('customers',{name:'Client',email:'client@example.test',phone:'1'},admin.cookie);
  const account=await call('users',{name:'Client',email:'client@example.test',role:'Client',customer_id:customer.data.id,password},admin.cookie);
  const client=await call('login',{email:'client@example.test',password});await call('resend-verification',{},client.cookie);await call('verify-email',{token:token()});
  await call('forgot-password',{email:'client@example.test'});const old=token();
  assert.equal((await call('users',{id:account.data.id,name:'Client',email:'changed@example.test',role:'Client',customer_id:customer.data.id},admin.cookie)).status,200);
  assert.equal((await call('reset-password',{token:old,password,confirm_password:password})).status,400);
  const next=await call('login',{email:'changed@example.test',password});assert.equal((await call('session',null,next.cookie)).data.user.email_verified_at,null);
  assert.equal((await call('data',null,client.cookie)).status,401);
});
