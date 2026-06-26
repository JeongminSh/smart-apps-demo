const { DatabaseSync } = require('node:sqlite')
const fs = require('fs')
const path = require('path')

const db = new DatabaseSync(path.join(__dirname, 'fitzone.db'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
db.exec(schema)

console.log('Datenbank initialisiert: server/db/fitzone.db')
db.close()
