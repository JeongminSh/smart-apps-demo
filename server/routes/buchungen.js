const express = require('express')
const db = require('../db/client')
const router = express.Router()

// GET /api/v1/buchungen?kurstermin_id=X
router.get('/', (req, res) => {
  const { kurstermin_id } = req.query
  const rows = kurstermin_id
    ? db.prepare('SELECT * FROM buchung WHERE kurstermin_id = ?').all(kurstermin_id)
    : db.prepare('SELECT * FROM buchung').all()
  res.json(rows)
})

// POST /api/v1/buchungen  — buchen oder auf Warteliste setzen
router.post('/', (req, res) => {
  const { mitglied_id, kurstermin_id } = req.body
  // TODO: Kapazitätsprüfung, Tarif-Limit, Warteliste-Logik (FZ-003, FZ-004)
  const result = db
    .prepare(
      'INSERT INTO buchung (mitglied_id, kurstermin_id, gebucht_am) VALUES (?, ?, ?)'
    )
    .run(mitglied_id, kurstermin_id, new Date().toISOString())
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

// PUT /api/v1/buchungen/:id/stornieren
router.put('/:id/stornieren', (req, res) => {
  // TODO: 2h-Frist prüfen, Stornogebühr berechnen (FZ-007)
  db.prepare('UPDATE buchung SET storniert_am=? WHERE id=?')
    .run(new Date().toISOString(), req.params.id)
  res.json({ ok: true })
})

// PUT /api/v1/buchungen/:id/checkin
router.put('/:id/checkin', (req, res) => {
  db.prepare('UPDATE buchung SET erschienen=1, checkin_zeit=? WHERE id=?')
    .run(new Date().toISOString(), req.params.id)
  res.json({ ok: true })
})

module.exports = router
