import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db, as, q, check, owner, outsider } from './audit-database.mjs';

const migration = readFileSync(new URL('../drizzle/migrations/0020_read_date_half_stars_consent.sql', import.meta.url), 'utf8');
await db.exec('reset role');
await db.exec(migration);
await db.exec(migration); // idempotente

const shelfBook = '10000000-0000-4000-8000-000000000020';

await check('ratings accept half stars and keep whole stars', async () => {
  await as(owner);
  await db.query(`insert into books(id,user_id,title,author,pages,status) values($1,$2,'Leído antes','Autora',120,'TBR')`, [shelfBook, owner]);
  await db.query('update books set user_rating=4.5 where id=$1', [shelfBook]);
  assert.equal(Number((await q('select user_rating r from books where id=$1', [shelfBook]))[0].r), 4.5);
  await db.query('update books set user_rating=3 where id=$1', [shelfBook]);
  for (const bad of [0, 4.3, 5.5]) await assert.rejects(db.query('update books set user_rating=$2 where id=$1', [shelfBook, bad]), /check/);
});

await check('a finished book takes a past date and leaves the streak alone', async () => {
  await as(owner);
  await db.query(`update books set status='READ' where id=$1`, [shelfBook]);
  const cycle = (await q('select reading_cycle c from books where id=$1', [shelfBook]))[0].c;
  await db.query(`select set_finished_date($1,$2,'2024-03-10','America/Bogota')`, [shelfBook, cycle]);
  const row = (await q(`select (finished_at at time zone 'America/Bogota')::date::text d, streak_day from completed_readings where book_id=$1 and cycle=$2`, [shelfBook, cycle]))[0];
  assert.equal(row.d, '2024-03-10');
  assert.equal(row.streak_day, null);
  const b = (await q(`select (finished_reading_at at time zone 'America/Bogota')::date::text d from books where id=$1`, [shelfBook]))[0];
  assert.equal(b.d, '2024-03-10');
});

await check('future dates, wrong cycles and other readers are refused', async () => {
  await as(owner);
  const cycle = (await q('select reading_cycle c from books where id=$1', [shelfBook]))[0].c;
  await assert.rejects(db.query(`select set_finished_date($1,$2,current_date+2,'UTC')`, [shelfBook, cycle]), /hoy o anterior/);
  await assert.rejects(db.query(`select set_finished_date($1,$2,'2024-01-01','UTC')`, [shelfBook, cycle + 1]), /Actualiza/);
  await as(outsider);
  await assert.rejects(db.query(`select set_finished_date($1,$2,'2024-01-01','UTC')`, [shelfBook, cycle]));
  await db.exec(`reset role;set role anon;set request.jwt.claim.sub=''`);
  await assert.rejects(db.query(`select set_finished_date($1,1,'2024-01-01','UTC')`, [shelfBook]), /permission/);
});

await check('signup consent is stored with server time and cannot be backdated', async () => {
  await db.exec('reset role');
  const reader = '00000000-0000-4000-8000-000000000020';
  const quiet = '00000000-0000-4000-8000-000000000021';
  await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'c@example.test',$2),($3,'q@example.test',$4)`,
    [reader, JSON.stringify({ privacy_version: '2026-11-22', contact_consent: true }), quiet, JSON.stringify({ contact_consent: 'tal vez' })]);
  const p = (await q('select privacy_version,privacy_accepted_at,contact_consent,contact_consent_at from profiles where id=$1', [reader]))[0];
  assert.equal(p.privacy_version, '2026-11-22');
  assert.ok(p.privacy_accepted_at && p.contact_consent === true && p.contact_consent_at);
  const s = (await q('select privacy_version,contact_consent,contact_consent_at from profiles where id=$1', [quiet]))[0];
  assert.deepEqual(s, { privacy_version: null, contact_consent: false, contact_consent_at: null });

  await as(reader);
  await db.query(`update profiles set privacy_accepted_at='2000-01-01', contact_consent_at='2000-01-01' where id=$1`, [reader]);
  const kept = (await q('select privacy_accepted_at a, contact_consent_at c from profiles where id=$1', [reader]))[0];
  assert.notEqual(new Date(kept.a).getUTCFullYear(), 2000);
  assert.notEqual(new Date(kept.c).getUTCFullYear(), 2000);
  await db.query('update profiles set contact_consent=false where id=$1', [reader]);
  assert.equal((await q('select contact_consent c from profiles where id=$1', [reader]))[0].c, false);
});

console.log('read date, half star and consent assertions passed');
await db.close();
