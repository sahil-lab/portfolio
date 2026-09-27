import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {gameKinds} from './friends-games.mjs';

export class FriendsStore{
 constructor(filename){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true});
  this.database=new DatabaseSync(filename);
  this.database.exec(`PRAGMA journal_mode=WAL;
   CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY,created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS members(room TEXT NOT NULL,id TEXT NOT NULL,token_hash TEXT NOT NULL,name TEXT NOT NULL,color TEXT NOT NULL,car TEXT NOT NULL,PRIMARY KEY(room,id));
   CREATE TABLE IF NOT EXISTS results(room TEXT NOT NULL,id TEXT NOT NULL,game TEXT NOT NULL,ended_at INTEGER NOT NULL,podium TEXT NOT NULL,reason TEXT NOT NULL,PRIMARY KEY(room,id));
   CREATE TABLE IF NOT EXISTS scores(room TEXT NOT NULL,game TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,color TEXT NOT NULL,wins INTEGER NOT NULL,points INTEGER NOT NULL,best_ms INTEGER,PRIMARY KEY(room,game,id));`);
 }
 hasRoom(code){return !!this.database.prepare('SELECT code FROM rooms WHERE code=?').get(code)}
 createRoom(code,now){this.database.prepare('INSERT INTO rooms(code,created_at) VALUES(?,?)').run(code,now)}
 member(code,id){return this.database.prepare('SELECT * FROM members WHERE room=? AND id=?').get(code,id)}
 saveMember(code,member,tokenHash){
  this.database.prepare(`INSERT INTO members(room,id,token_hash,name,color,car) VALUES(?,?,?,?,?,?)
   ON CONFLICT(room,id) DO UPDATE SET name=excluded.name,color=excluded.color,car=excluded.car`).run(code,member.id,tokenHash,member.name,member.color,member.car);
 }
 result(code,match){
  this.database.exec('BEGIN IMMEDIATE');
  try{
   const inserted=this.database.prepare('INSERT OR IGNORE INTO results(room,id,game,ended_at,podium,reason) VALUES(?,?,?,?,?,?)').run(code,match.id,match.kind,match.endsAt,JSON.stringify(match.podium),match.reason);
   if(inserted.changes){
    const update=this.database.prepare(`INSERT INTO scores(room,game,id,name,color,wins,points,best_ms) VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(room,game,id) DO UPDATE SET name=excluded.name,color=excluded.color,wins=scores.wins+excluded.wins,points=scores.points+excluded.points,
     best_ms=CASE WHEN scores.best_ms IS NULL THEN excluded.best_ms WHEN excluded.best_ms IS NULL THEN scores.best_ms ELSE MIN(scores.best_ms,excluded.best_ms) END`);
    for(const row of match.podium)update.run(code,match.kind,row.id,row.name,row.color,row.place===1&&!row.draw?1:0,row.score,row.timeMs);
   }
   this.database.exec('COMMIT');return !!inserted.changes;
  }catch(error){this.database.exec('ROLLBACK');throw error}
 }
 records(code){
  return Object.fromEntries(gameKinds.map(kind=>{
   const top=this.database.prepare('SELECT id,name,color,wins,points,best_ms AS bestMs FROM scores WHERE room=? AND game=? ORDER BY wins DESC,points DESC,COALESCE(best_ms,9000000000000000),id LIMIT 3').all(code,kind);
   const last=this.database.prepare('SELECT id,ended_at AS endedAt,podium,reason FROM results WHERE room=? AND game=? ORDER BY ended_at DESC,rowid DESC LIMIT 1').get(code,kind);
   return [kind,{top,last:last?{...last,podium:JSON.parse(last.podium)}:null}];
  }));
 }
 close(){this.database.close()}
}
