const express = require('express')
const db = require('../db/client')
const router = express.Router()

// GET /api/v1/warteliste?kurstermin_id=X
router.get('/', (req, res) => {
  const { kurstermin_id } = req.query
  const rows = kurstermin_id
    ? db
        .prepare('SELECT * FROM warteliste WHERE kurstermin_id = ? ORDER BY position')
        .all(kurstermin_id)
    : db.prepare('SELECT * FROM warteliste ORDER BY kurstermin_id, position').all()
  res.json(rows)
})

// POST /api/v1/warteliste  — auf Warteliste setzen
router.post('/', (req, res) => {
  const { mitglied_id, kurstermin_id } = req.body
  const max = 5
  const count = db
    .prepare('SELECT COUNT(*) as n FROM warteliste WHERE kurstermin_id = ?')
    .get(kurstermin_id).n
  if (count >= max) return res.status(409).json({ error: 'Warteliste voll (max. 5)' })

  const position = count + 1
  const result = db
    .prepare(
      'INSERT INTO warteliste (mitglied_id, kurstermin_id, position, eingetragen_am) VALUES (?, ?, ?, ?)'
    )
    .run(mitglied_id, kurstermin_id, position, new Date().toISOString())
  res.status(201).json({ id: result.lastInsertRowid, position })
})

module.exports = router
