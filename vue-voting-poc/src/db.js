import Dexie from 'dexie';

export const db = new Dexie('votingDB');
db.version(1).stores({
  votes: 'id, status, retries, signature'
});