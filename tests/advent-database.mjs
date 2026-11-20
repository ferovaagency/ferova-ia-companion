import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db, as, q, check } from './audit-database.mjs';

await db.exec('reset role');
for (const file of ['0015_immutable_reward_evidence.sql', '0016_reader_plans_whop.sql', '0017_advent_challenges.sql']) {
  await db.exec(readFileSync(new URL('../drizzle/migrations/' + file, import.meta.url), 'utf8'));
}
const reader = '00000000-0000-4000-8000-000000000020';
const other = '00000000-0000-4000-8000-000000000021';
const bookId = '10000000-0000-4000-8000-000000000020';
await db.query(`insert into auth.users(id,email) values($1,'a@example.test'),($2,'b@example.test')`, [reader, other]);
await db.query(`insert into books(id,user_id,title,author,pages,status) values($1,$2,'Libro','A',300,'READING')`, [bookId, reader]);
const cal = (await q(`insert into reader_calendars(user_id,kind,year) values($1,'advent',2026) returning id`, [reader]))[0].id;
const makePro = async (id) => {
  await db.exec('reset role');
  await db.query(`insert into profiles(id,display_name) values($1,'x') on conflict (id) do nothing`, [id]);
  await db.query(`insert into memberships(user_id,email,is_paid,payment_source) values($1,'p@example.test',true,'manual') on conflict (user_id) do update set is_paid=true`, [id]);
};
const complete = (slot) => db.query(`select complete_advent_challenge($1,$2,'UTC')`, [cal, slot]);

await check('challenges stay locked before their December day', async () => {
  await as(reader);
  await assert.rejects(complete(2), /se abre el 2 de diciembre/);
});

// Simula estar en diciembre: el resto de pruebas no depende de la fecha real.
await db.exec('reset role');
await db.exec(`create or replace function public.advent_unlocked(p_year integer, p_slot integer, p_day date) returns boolean language sql immutable as $$ select true $$`);

await check('book windows are not challenges and readers only complete their own calendar', async () => {
  await as(reader);
  await assert.rejects(complete(1), /trae un libro/);
  await as(other);
  await assert.rejects(complete(2), /No encontramos tu calendario/);
});
await check('a self-marked experience completes once and is idempotent', async () => {
  await as(reader);
  await complete(2);
  await complete(2);
  assert.deepEqual((await q(`select slot from reader_advent_progress`)).map((r) => r.slot), [2]);
});
await check('free plan only reaches challenges in windows 1-3', async () => {
  await as(reader);
  await assert.rejects(complete(4), /Lee con Koa Pro/);
});
await check('"read 10 pages" needs 10 real pages today, not the timer or other days', async () => {
  await makePro(reader);
  await as(reader);
  await assert.rejects(complete(4), /Hoy llevas 0 de 10 páginas/);
  await db.query(`select record_reading($1,1,0,6,current_date,'UTC',5,'')`, [bookId]);
  await assert.rejects(complete(4), /Hoy llevas 6 de 10 páginas/);
  await db.query(`select record_reading($1,1,6,12,current_date,'UTC',5,'')`, [bookId]);
  await complete(4);
});
await check('minutes challenges add up the minutes logged today', async () => {
  await as(reader);
  await assert.rejects(complete(9), /Hoy llevas 10 de 15 minutos/);
  await db.query(`select record_reading($1,1,12,14,current_date,'UTC',5,'')`, [bookId]);
  await complete(9);
});
await check('note challenges need a note saved today', async () => {
  await as(reader);
  await assert.rejects(complete(7), /Guarda hoy una nota/);
  await db.query(`insert into reader_notes(book_id,kind,content) values($1,'quote','Una frase')`, [bookId]);
  await complete(7);
});
await check('completing challenges never writes reading history; progress cannot be forged', async () => {
  await as(reader);
  const before = (await q(`select count(*) n from reading_sessions`))[0].n;
  await complete(11);
  assert.equal((await q(`select count(*) n from reading_sessions`))[0].n, before);
  await assert.rejects(db.query(`insert into reader_advent_progress(calendar_id,slot) values($1,14)`, [cal]), /permission/);
  await as(other);
  assert.equal((await q(`select count(*) n from reader_advent_progress`))[0].n, 0);
});
console.log('advent challenge assertions passed');
await db.close();
