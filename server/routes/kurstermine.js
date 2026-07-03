const express = require('express')
const db = require('../db/client')
const router = express.Router()

const WITH_JOINS = `
  SELECT k.*, kt.name as kurstyp_name, kt.format as kurstyp_format, t.name as trainer_name,
         (SELECT COUNT(*) FROM buchung WHERE kurstermin_id = k.id AND storniert_am IS NULL) as buchungen_count
  FROM kurstermin k
  JOIN kurstyp kt ON kt.id = k.kurstyp_id
  JOIN trainer t ON t.id = k.trainer_id
`

router.get('/', (req, res) => {
  res.json(db.prepare(WITH_JOINS + 'ORDER BY k.datum_zeit').all())
})

router.get('/:id', (req, res) => {
  const row = db.prepare(WITH_JOINS + 'WHERE k.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(row)
})

router.post('/', (req, res) => {
  const { kurstyp_id, trainer_id, datum_zeit, kapazitaet, zoom_link } = req.body
  const result = db.prepare(
    'INSERT INTO kurstermin (kurstyp_id, trainer_id, datum_zeit, kapazitaet, zoom_link) VALUES (?, ?, ?, ?, ?)'
  ).run(kurstyp_id, trainer_id, datum_zeit, kapazitaet, zoom_link ?? null)
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

// kurstyp_id ist nach Anlage nicht mehr änderbar
router.put('/:id', (req, res) => {
  const { trainer_id, datum_zeit, kapazitaet, zoom_link } = req.body
  db.prepare('UPDATE kurstermin SET trainer_id=?, datum_zeit=?, kapazitaet=?, zoom_link=? WHERE id=?')
    .run(trainer_id, datum_zeit, kapazitaet, zoom_link ?? null, req.params.id)
  res.json({ ok: true })
})

router.put('/:id/absagen', (req, res) => {
  db.prepare("UPDATE kurstermin SET status='abgesagt' WHERE id=?").run(req.params.id)
  // TODO: Benachrichtigung aller gebuchten Mitglieder (FZ-010)
  res.json({ ok: true })
})

module.exports = router
