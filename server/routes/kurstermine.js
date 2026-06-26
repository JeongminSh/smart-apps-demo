const express = require('express')
const db = require('../db/client')
const router = express.Router()

// GET /api/v1/kurstermine
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM kurstermin ORDER BY datum_zeit').all()
  res.json(rows)
})

// GET /api/v1/kurstermine/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM kurstermin WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(row)
})

// POST /api/v1/kurstermine
router.post('/', (req, res) => {
  const { kurstyp_id, trainer_id, datum_zeit, kapazitaet, zoom_link } = req.body
  const result = db
    .prepare(
      'INSERT INTO kurstermin (kurstyp_id, trainer_id, datum_zeit, kapazitaet, zoom_link) VALUES (?, ?, ?, ?, ?)'
    )
    .run(kurstyp_id, trainer_id, datum_zeit, kapazitaet, zoom_link)
  res.status(201).json({ id: result.lastInsertRowid })
})

// PUT /api/v1/kurstermine/:id/absagen
router.put('/:id/absagen', (req, res) => {
  db.prepare("UPDATE kurstermin SET status='abgesagt' WHERE id=?").run(req.params.id)
  // TODO: Benachrichtigung aller gebuchten Mitglieder (FZ-010)
  res.json({ ok: true })
})

module.exports = router
