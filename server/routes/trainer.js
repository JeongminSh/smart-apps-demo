const express = require('express')
const db = require('../db/client')
const router = express.Router()

// GET /api/v1/trainer
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM trainer').all())
})

// GET /api/v1/trainer/:id/kurstermine  — eigene Termine
router.get('/:id/kurstermine', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM kurstermin WHERE trainer_id = ? ORDER BY datum_zeit')
    .all(req.params.id)
  res.json(rows)
})

// POST /api/v1/trainer
router.post('/', (req, res) => {
  const { name, anstellungsart } = req.body
  const result = db
    .prepare('INSERT INTO trainer (name, anstellungsart) VALUES (?, ?)')
    .run(name, anstellungsart)
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

module.exports = router
