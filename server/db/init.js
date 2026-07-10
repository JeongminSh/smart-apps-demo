const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')

const db = new DatabaseSync(path.join(__dirname, 'fitzone.db'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

// Migration für bestehende DBs, die mitglied ohne diese Spalte angelegt haben (FZ-007)
try {
  db.exec('ALTER TABLE mitglied ADD COLUMN offene_stornogebuehr REAL NOT NULL DEFAULT 0')
} catch (err) {
  if (!err.message.includes('duplicate column name')) throw err
}

console.log('Datenbank initialisiert: server/db/fitzone.db')
db.close()
