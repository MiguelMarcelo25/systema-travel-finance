import test from 'node:test';
import assert from 'node:assert/strict';
import { handleApi } from './verified-fixture.mjs';
import { openDatabase } from '../src/database.mjs';

async function fixture(t) {
  const DB=openDatabase(':memory:'); t.after(()=>DB.close());
  const call=async(path,data,cookie='',database=DB)=>{
    const response=await handleApi(new Request('https://systema.example/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:data?JSON.stringify(data):undefined}),{DB:database,LOCAL:true});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const admin=await call('setup',{name:'Administrator',email:'admin@example.test',password:'Deletion-test-1234',agency:'Test',demo:true});
  const account=await call('users',{name:'Traveler',email:'traveler@example.test',role:'Client',customer_id:'CUS-DEMO01',password:'Deletion-test-1234'},admin.cookie);
  const client=await call('login',{email:'traveler@example.test',password:'Deletion-test-1234'});
  const id=account.data.id;
  await DB.prepare('UPDATE customers SET email=? WHERE id=?').bind('traveler@example.test','CUS-DEMO01').run();
  await DB.prepare('INSERT INTO account_tokens(token_hash,user_id,purpose,email,expires) VALUES(?,?,?,?,?)').bind('reset-token',id,'reset','traveler@example.test',Date.now()+60000).run();
  await DB.prepare("INSERT INTO client_documents(id,customer_id,requirement_id,file_name,mime,size,storage_path,request_id,status,notes,created,uploaded_by) VALUES('DOC','CUS-DEMO01','visa-form','visa.pdf','application/pdf',10,'CUS-DEMO01/DOC.pdf','upload-test','Pending review','','now',?)").bind(id).run();
  const payload={id,confirm_email:'traveler@example.test'};
  return {DB,call,admin,client,id,payload};
}

test('account deletion requires administrator confirmation and preserves client history',async t=>{
  const {DB,call,admin,client,id,payload}=await fixture(t);
  const before=(await call('data',null,admin.cookie)).data;
  assert.equal((await call('users/delete',payload)).status,401);
  assert.equal((await call('users/delete',payload,client.cookie)).status,403);
  assert.equal((await call('users/delete',{id:before.user.id,confirm_email:before.user.email},admin.cookie)).status,409);
  assert.equal((await call('users/delete',{...payload,confirm_email:'wrong@example.test'},admin.cookie)).status,409);
  assert.equal((await call('users/delete',{id},admin.cookie)).status,400);
  assert.equal((await call('users/delete',{...payload,id:'missing'},admin.cookie)).status,404);
  assert.equal((await call('users/delete',payload,admin.cookie)).status,200);
  const after=(await call('data',null,admin.cookie)).data;
  assert.ok(!after.users.some(row=>row.id===id));
  for(const key of ['customers','bookings','payments','expenses','requests'])assert.deepEqual(after[key],before[key],key+' retained');
  assert.equal((await DB.prepare('SELECT uploaded_by FROM client_documents WHERE id=?').bind('DOC').first()).uploaded_by,id);
  assert.equal((await DB.prepare('SELECT count(*) AS count FROM sessions WHERE user_id=?').bind(id).first()).count,0);
  assert.equal((await DB.prepare('SELECT count(*) AS count FROM account_tokens WHERE user_id=?').bind(id).first()).count,0);
  assert.equal((await call('data',null,client.cookie)).status,401);
  assert.equal((await call('login',{email:payload.confirm_email,password:'Deletion-test-1234'})).status,401);
  assert.equal((await call('users/delete',payload,admin.cookie)).status,404);
  assert.equal((await call('users',{id,name:'Traveler',email:payload.confirm_email,role:'Client',customer_id:'CUS-DEMO01',active:true},admin.cookie)).status,404);
  const tombstone=await DB.prepare('SELECT active,deleted_at,password,customer_id FROM users WHERE id=?').bind(id).first();
  assert.equal(tombstone.active,0);assert.ok(tombstone.deleted_at);assert.equal(tombstone.customer_id,null);assert.ok(tombstone.password.startsWith('deleted:'));
  await assert.rejects(DB.prepare('UPDATE users SET active=1 WHERE id=?').bind(id).run(),/CHECK/);
  assert.equal(after.audits.filter(row=>row.action.startsWith('Deleted client account:')&&row.entity_id===id).length,1);
  assert.equal((await call('register',{name:'Replacement',email:payload.confirm_email,phone:'123',password:'Deletion-test-1234',confirm_password:'Deletion-test-1234'})).status,409);
});

test('failed account deletion rolls back credentials, sessions, tokens and audit',async t=>{
  const {DB,call,admin,client,id,payload}=await fixture(t);
  const before=await DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first();
  const failingDB={...DB,batch:statements=>DB.batch([...statements,DB.prepare("INSERT INTO settings(key,value) VALUES('agency','duplicate')")])};
  assert.equal((await call('users/delete',payload,admin.cookie,failingDB)).status,409);
  assert.deepEqual(await DB.prepare('SELECT * FROM users WHERE id=?').bind(id).first(),before);
  assert.equal((await call('data',null,client.cookie)).status,200);
  assert.equal((await DB.prepare('SELECT count(*) AS count FROM account_tokens WHERE user_id=?').bind(id).first()).count,1);
  assert.equal((await DB.prepare("SELECT count(*) AS count FROM audit WHERE action LIKE 'Deleted client account:%'").first()).count,0);
});
