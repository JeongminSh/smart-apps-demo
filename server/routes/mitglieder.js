const express = require('express')
const db = require('../db/client')
const router = express.Router()

// GET /api/v1/mitglieder
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM mitglied').all()
  res.json(rows)
})

// GET /api/v1/mitglieder/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM mitglied WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(row)
})

// POST /api/v1/mitglieder
router.post('/', (req, res) => {
  const { name, email, telefon, geburtstag } = req.body
  const result = db
    .prepare('INSERT INTO mitglied (name, email, telefon, geburtstag) VALUES (?, ?, ?, ?)')
    .run(name, email, telefon, geburtstag)
  res.status(201).json({ id: result.lastInsertRowid })
})

// PUT /api/v1/mitglieder/:id
router.put('/:id', (req, res) => {
  const { name, email, telefon, geburtstag } = req.body
  db.prepare('UPDATE mitglied SET name=?, email=?, telefon=?, geburtstag=? WHERE id=?')
    .run(name, email, telefon, geburtstag, req.params.id)
  res.json({ ok: true })
})

module.exports = router
