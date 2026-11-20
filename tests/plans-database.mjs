import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db, as, q, check, owner, member, outsider } from './audit-database.mjs';

await db.exec('reset role');
for (const file of ['0015_immutable_reward_evidence.sql', '0016_reader_plans_whop.sql']) {
  await db.exec(readFileSync(new URL('../drizzle/migrations/' + file, import.meta.url), 'utf8'));
}
const makePro = async (id) => {
  await db.exec('reset role');
  await db.query(`insert into profiles(id,display_name) values($1,'x') on conflict (id) do nothing`, [id]);
  await db.query(`insert into memberships(user_id,email,is_paid,payment_source,plan,status) values($1,'p@example.test',true,'whop','monthly','active')
    on conflict (user_id) do update set is_paid=true,payment_source='whop',status='active'`, [id]);
};

await check('free reader gets 3 Oracle consults per month, then a clear limit', async () => {
  await as(outsider);
  for (const left of [2, 1, 0]) assert.equal((await q(`select claim_reader_feature('oracle') n`))[0].n, left);
  await assert.rejects(db.exec(`select claim_reader_feature('oracle')`), /3 consultas del Oráculo/);
});
await check('Pro-only features are refused on the free plan and unknown features always', async () => {
  await as(outsider);
  await assert.rejects(db.exec(`select claim_reader_feature('monthly_calendar')`), /Lee con Koa Pro/);
  await assert.rejects(db.exec(`select claim_reader_feature('anything')`), /desconocida/);
});
await check('readers cannot forge usage or their own paid membership', async () => {
  await as(outsider);
  await assert.rejects(db.exec(`insert into reader_feature_usage values('${outsider}','oracle',current_date,0)`), /permission/);
  await db.exec(`update memberships set is_paid=true where user_id='${outsider}'`).catch(() => {});
  assert.equal((await q(`select count(*) n from memberships where is_paid`))[0].n, 0);
  await assert.rejects(db.exec(`select reader_is_pro('${outsider}')`), /permission/);
});
await check('free library stops at 50 books; Pro has no cap', async () => {
  await as(member);
  const have = Number((await q(`select count(*) n from books`))[0].n);
  await db.query(`insert into books(user_id,title,author) select $1,'Libro '||g,'A' from generate_series(1,$2::int) g`, [member, 50 - have]);
  await assert.rejects(db.query(`insert into books(user_id,title,author) values($1,'Uno más','A')`, [member]), /hasta 50 libros/);
  await makePro(member);
  await as(member);
  await db.query(`insert into books(user_id,title,author) values($1,'Uno más','A')`, [member]);
  assert.equal(Number((await q(`select count(*) n from books`))[0].n), 51);
});
await check('free readers keep 3 own lists; annual calendar lists do not count', async () => {
  await as(outsider);
  const have = Number((await q(`select count(*) n from reader_lists where annual_year is null`))[0].n);
  for (let i = have; i < 3; i++) await db.query(`insert into reader_lists(name) values($1)`, ['Lista ' + i]);
  await assert.rejects(db.exec(`insert into reader_lists(name) values('Cuarta')`), /3 listas/);
  await db.exec(`insert into reader_lists(name,annual_year) values('Lecturas para 2027',2027)`);
});
await check('free readers keep one bingo', async () => {
  await as(outsider);
  const have = Number((await q(`select count(*) n from reader_bingos`))[0].n);
  const cells = JSON.stringify(Array.from({ length: 9 }, () => ({ kind: 'experience', label: 'x', condition: 'any', value: '' })));
  if (have === 0) await db.query(`insert into reader_bingos(title,size,cells) values('Uno',3,$1::jsonb)`, [cells]);
  await assert.rejects(db.query(`insert into reader_bingos(title,size,cells) values('Dos',3,$1::jsonb)`, [cells]), /un bingo/);
});
await check('creating clubs is Pro; Pro readers can create them', async () => {
  await as(outsider);
  await assert.rejects(db.exec(`select reader_club_action('create',null,'Mi club','','','UTC')`), /clubes es parte de Lee con Koa Pro/);
  await makePro(outsider);
  await as(outsider);
  assert.ok((await q(`select reader_club_action('create',null,'Mi club','','','UTC') id`))[0].id);
});
await check('free Advent opens windows 1-3 only; Pro opens all', async () => {
  await db.exec('reset role');
  const reader = '00000000-0000-4000-8000-000000000009';
  await db.query(`insert into auth.users(id,email) values($1,'r@example.test')`, [reader]);
  assert.equal((await q(`select reader_is_pro($1) p`, [reader]))[0].p, false);
  const cal = (await q(`insert into reader_calendars(user_id,kind,year) values($1,'advent',2026) returning id`, [reader]))[0].id;
  await db.query(`insert into reader_calendar_entries(calendar_id,slot,title,author,catalog_id) select $1,g,'T'||g,'A','c'||g from generate_series(1,5) g`, [cal]);
  await db.query(`update reader_calendar_entries set opened_at=now() where calendar_id=$1 and slot=3`, [cal]);
  await assert.rejects(db.query(`update reader_calendar_entries set opened_at=now() where calendar_id=$1 and slot=4`, [cal]), /ventanas 1 a 3/);
  await makePro(reader);
  await db.query(`update reader_calendar_entries set opened_at=now() where calendar_id=$1 and slot=4`, [cal]);
});
await check('Pro has no monthly cap and plan status reports only the caller', async () => {
  await as(outsider);
  assert.equal((await q(`select claim_reader_feature('oracle') n`))[0].n, -1);
  const s = (await q(`select reader_plan_status() s`))[0].s;
  assert.equal(s.pro, true);
  assert.equal(s.plan, 'monthly');
  assert.equal(s.usage.oracle, 3, 'a refused consult is rolled back and Pro consults are not counted');
  await db.exec("reset role;set role anon;set request.jwt.claim.sub=''");
  await assert.rejects(db.exec('select reader_plan_status()'), /permission/);
});
await check('an expired courtesy stops counting as Pro without any job running', async () => {
  await db.exec('reset role');
  const guest = '00000000-0000-4000-8000-000000000010';
  await db.query(`insert into auth.users(id,email) values($1,'g@example.test')`, [guest]);
  await db.query(`insert into profiles(id,display_name) values($1,'g') on conflict (id) do nothing`, [guest]);
  await db.query(`insert into memberships(user_id,email,is_paid,payment_source,access_expires_at) values($1,'g@example.test',true,'courtesy',now()+interval '1 day')`, [guest]);
  assert.equal((await q(`select reader_is_pro($1) p`, [guest]))[0].p, true);
  await db.query(`update memberships set access_expires_at=now()-interval '1 minute' where user_id=$1`, [guest]);
  assert.equal((await q(`select reader_is_pro($1) p`, [guest]))[0].p, false);
});
await check('admin overview is only for the server key', async () => {
  await db.exec('reset role');
  assert.ok((await q(`select * from reader_admin_overview()`)).length >= 4);
  await as(outsider);
  await assert.rejects(db.exec(`select * from reader_admin_overview()`), /permission/);
});
console.log('plans database assertions passed');
await db.close();
