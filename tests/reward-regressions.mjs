import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db, as, q, check, owner, outsider, book, foreign } from './audit-database.mjs';
await db.exec('reset role');
await db.exec(readFileSync(new URL('../drizzle/migrations/0015_immutable_reward_evidence.sql', import.meta.url),'utf8'));
await as(owner);
const session=(await q('select id from reading_sessions where book_id=$1 limit 1',[book]))[0].id;
const before=(await q('select count(*) n from reader_day_rewards'))[0].n;
await check('moving rewarded evidence repeatedly never creates new rewards',async()=>{
  for(const days of [2,3,4]) {
    await db.query("select revise_session($1,current_date-$2::int,'UTC',10,'corrected date',false)",[session,days]);
    assert.equal((await q('select reader_claim_rewards() n'))[0].n,0);
  }
  assert.equal((await q('select count(*) n from reader_day_rewards'))[0].n,before);
});
await check('removing corrected reading retains earned inventory without more awards',async()=>{
  await db.query("select revise_session($1,current_date,'UTC',10,'',true)",[session]);
  assert.equal((await q('select reader_claim_rewards() n'))[0].n,0);
  assert.equal((await q('select count(*) n from reader_day_rewards'))[0].n,before);
});
await check('evidence cannot be forged or read by readers or anonymous callers',async()=>{
  await assert.rejects(db.exec('select * from reader_reward_evidence'),/permission/);
  await assert.rejects(db.query("insert into reader_reward_evidence values($1,'session','fake',current_date)",[owner]),/permission/);
  await db.exec("reset role;set role anon;set request.jwt.claim.sub=''");
  await assert.rejects(db.exec('select reader_claim_rewards()'),/permission/);
});
await check('new genuine progress grants one reward, including queued retries',async()=>{
  await as(outsider);
  await db.query("select record_reading($1,1,0,5,current_date,'UTC',10,'')",[foreign]);
  const claims=await Promise.all([q('select reader_claim_rewards() n'),q('select reader_claim_rewards() n')]);
  assert.equal(claims.reduce((sum,r)=>sum+r[0].n,0),1);
  assert.equal((await q('select count(*) n from reader_day_rewards'))[0].n,1);
  await db.query("select record_reading($1,1,5,10,current_date,'UTC',10,'')",[foreign]);
  assert.equal((await q('select reader_claim_rewards() n'))[0].n,0);
});
await db.close();
