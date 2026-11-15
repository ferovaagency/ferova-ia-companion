import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
for(const file of ['20260610151907_92ad47d7-a4d5-4623-9753-e2806f14205e.sql','20260612224629_d8f78d55-e4ff-4f78-b64c-65e49ffa3fac.sql','20261109225508_reader_journal.sql','20261109231121_finish_active_book.sql','20261109231349_reader_setup_import.sql','20261115002935_koa_reading_companion.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';const book='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',unknown='10000000-0000-4000-8000-000000000003';
await db.exec(`insert into auth.users(id,email) values('${a}','a@example.test'),('${b}','b@example.test');insert into books(id,user_id,title,status,pages) values('${book}','${a}','Uno','READING',100),('${other}','${b}','Dos','READING',200),('${unknown}','${a}','Sin páginas','READING',0);set role authenticated;set request.jwt.claim.sub='${a}';`);
let passes=0;
async function check(name,fn){await fn();passes++;console.log('PASS',name);}
async function denied(sql){await assert.rejects(db.exec(sql));}
await check('notes cannot reference another reader book',()=>denied(`insert into reader_notes(book_id,content) values('${other}','private')`));
await check('notes cannot forge owner',()=>denied(`insert into reader_notes(user_id,book_id,content) values('${b}','${book}','private')`));
await db.exec(`insert into reader_notes(book_id,content) values('${book}','My quote');`);
await check('other reader cannot read/update/delete notes',async()=>{await db.exec(`set request.jwt.claim.sub='${b}';`);assert.equal((await db.query('select * from reader_notes')).rows.length,0);await db.exec(`update reader_notes set content='stolen';delete from reader_notes;set request.jwt.claim.sub='${a}';`);assert.equal((await db.query('select content from reader_notes')).rows[0].content,'My quote');});
await check('preference cannot reassign owner',async()=>{await db.exec(`insert into reader_preferences(user_id) values('${a}')`);await denied(`update reader_preferences set user_id='${b}'`);});
await check('wish deduplicates title author',async()=>{await db.exec(`insert into reader_wishes(title,author) values('Book','Writer')`);await denied(`insert into reader_wishes(title,author) values(' book ',' writer ')`);});
const close=(id,from,to,finish=false,bid=book)=>`select close_reader_session('${id}','${bid}',1,${from},${to},10,current_date,'UTC','note',${finish})`;
await check('time only does not create reading or streak',async()=>{await denied(close('20000000-0000-4000-8000-000000000000',0,0));assert.equal((await db.query('select * from reading_sessions')).rows.length,0);});
await check('session close records pages once on retries',async()=>{const sql=close('20000000-0000-4000-8000-000000000001',0,10);await db.exec(sql);await db.exec(sql);assert.equal((await db.query('select * from reading_sessions')).rows.length,1);assert.equal((await db.query(`select current_page from books where id='${book}'`)).rows[0].current_page,10);});
await check('stale page rejects second operation',()=>denied(close('20000000-0000-4000-8000-000000000002',0,20)));
await check('cannot close another reader session',()=>denied(close('20000000-0000-4000-8000-000000000003',0,20,false,other)));
await check('finishing active book counts without incremental updates',async()=>{await db.exec(close('20000000-0000-4000-8000-000000000004',10,10,true));const rows=(await db.query(`select status,current_page from books where id='${book}'`)).rows;assert.equal(rows[0].status,'READ');assert.equal(rows[0].current_page,100);assert.equal((await db.query('select distinct day from reading_sessions')).rows.length,1);});
await check('unknown page count completion gets streak date',async()=>{await db.exec(close('20000000-0000-4000-8000-000000000005',0,0,true,unknown));assert.ok((await db.query(`select streak_day from completed_readings where book_id='${unknown}'`)).rows[0].streak_day);});
await check('quota is per user and enforces 30 per hour',async()=>{for(let i=0;i<30;i++)await db.exec('select claim_koa_request()');await denied('select claim_koa_request()');await db.exec(`set request.jwt.claim.sub='${b}';select claim_koa_request();`);});
await check('anonymous cannot close sessions or query notes',async()=>{await db.exec('reset role;set role anon;');await denied('select * from reader_notes');await denied(close('20000000-0000-4000-8000-000000000006',0,20));});
console.log(`${passes} database assertions passed`);await db.close();
