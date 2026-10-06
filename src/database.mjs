import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
export function openDatabase(filename = './data/systema.sqlite') {
 if(filename!==':memory:') mkdirSync('./data',{recursive:true});
 const sqlite = new DatabaseSync(filename); sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
 sqlite.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)');
 for(const f of readdirSync('./drizzle').filter(f=>f.endsWith('.sql')).sort()) {
  if(!sqlite.prepare('SELECT name FROM _migrations WHERE name=?').get(f)) {
   sqlite.exec('BEGIN'); try { sqlite.exec(readFileSync('./drizzle/'+f,'utf8')); sqlite.prepare('INSERT INTO _migrations VALUES (?)').run(f); sqlite.exec('COMMIT'); } catch(e) { sqlite.exec('ROLLBACK'); throw e; }
  }
 }
 const wrap=(sql,args=[])=>({bind(...values){return wrap(sql,values)},async first(){return sqlite.prepare(sql).get(...args)??null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}}},sql,args});
 return {prepare:wrap,async batch(stmts){sqlite.exec('BEGIN IMMEDIATE');try{const result=[];for(const s of stmts)result.push(await s.run());sqlite.exec('COMMIT');return result}catch(e){sqlite.exec('ROLLBACK');throw e}},close(){sqlite.close()}};
}
