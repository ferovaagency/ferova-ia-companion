import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db, as, q, check, owner } from './audit-database.mjs';

const migration = readFileSync(new URL('../drizzle/migrations/0018_harden_anon_grants.sql', import.meta.url), 'utf8');
await db.exec('reset role');
await db.exec(migration);
await db.exec(migration); // idempotente

const anon = async () => db.exec(`reset role;set role anon;set request.jwt.claim.sub=''`);

await check('anon cannot write, truncate or run signed-in actions', async () => {
  await anon();
  await assert.rejects(db.exec(`truncate reader_social_profiles`), /permission/);
  await assert.rejects(db.exec(`delete from reader_social_profiles`), /permission/);
  await assert.rejects(db.exec(`insert into user_roles(user_id,role) values('${owner}','admin')`), /permission/);
  await assert.rejects(db.exec(`select reader_friend_action('owner','request')`), /permission/);
  await assert.rejects(db.exec(`select reader_club_action('create',null,'x','','','UTC')`), /permission/);
});
await check('anon keeps public profile reads', async () => {
  await anon();
  await q(`select handle from reader_social_profiles where visibility='public'`);
});
await check('signed-in readers keep their actions but cannot truncate', async () => {
  await as(owner);
  await q(`select reader_connections()`);
  await assert.rejects(db.exec(`truncate books`), /permission/);
});
await check('account deletion removes every reader row, active bingos included, and only the server can run it', async () => {
  await db.exec('reset role');
  const del = readFileSync(new URL('../drizzle/migrations/0019_delete_reader_account.sql', import.meta.url), 'utf8');
  await db.exec(del);
  await db.exec(del);
  const tables = await q(`select table_name t, column_name c from information_schema.columns c
    join information_schema.tables using (table_schema, table_name)
    where table_schema='public' and table_type='BASE TABLE' and data_type='uuid'
      and column_name in ('user_id','owner_id','requester','recipient','blocked_id','target_id')
      and table_name not in ('feedback','courtesy_accounts')`);
  const count = async () => {
    let n = 0;
    for (const r of tables) n += Number((await q(`select count(*) n from public.${r.t} where ${r.c}=$1`, [owner]))[0].n);
    return n;
  };
  const activeBingos = Number((await q(`select count(*) n from reader_bingos where user_id=$1 and state<>'draft'`, [owner]))[0].n);
  assert.ok(activeBingos > 0, 'fixture should have an active bingo');
  const before = await count();
  assert.ok(before > 0);
  await as(owner);
  await assert.rejects(db.query('select delete_reader_data($1)', [owner]), /permission/);
  await assert.rejects(db.exec(`delete from reader_bingos where state<>'draft'`), /borradores|permission/);
  await db.exec('reset role');
  await db.query('select delete_reader_data($1)', [owner]);
  assert.equal(await count(), 0);
  assert.ok(Number((await q(`select count(*) n from reader_social_profiles`))[0].n) > 0, 'other readers keep their data');
});
console.log('hardening assertions passed');
await db.close();
