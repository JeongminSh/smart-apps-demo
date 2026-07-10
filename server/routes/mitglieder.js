const express = require('express')
const db = require('../db/client')
const router = express.Router()

const WITH_TARIF = `
  SELECT m.*, ms.id as mitgliedschaft_id, ms.status as ms_status,
         ms.tarif_id, ms.start_datum as ms_start_datum, ms.end_datum as ms_end_datum,
         ms.pause_von, ms.pause_bis, ms.pause_tage_jahr,
         t.name as tarif_name, t.preis as tarif_preis
  FROM mitglied m
  LEFT JOIN mitgliedschaft ms ON ms.id = (
    SELECT id FROM mitgliedschaft WHERE mitglied_id = m.id ORDER BY id DESC LIMIT 1
  )
  LEFT JOIN tarif t ON t.id = ms.tarif_id
`

router.get('/', (req, res) => {
  res.json(db.prepare(WITH_TARIF + 'ORDER BY m.name').all())
})

router.get('/:id', (req, res) => {
  const row = db.prepare(WITH_TARIF + 'WHERE m.id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' })
  res.json(row)
})

router.post('/', (req, res) => {
  const { name, email, telefon, geburtstag } = req.body
  const result = db
    .prepare('INSERT INTO mitglied (name, email, telefon, geburtstag) VALUES (?, ?, ?, ?)')
    .run(name, email, telefon ?? null, geburtstag ?? null)
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

router.put('/:id', (req, res) => {
  const { name, email, telefon, geburtstag } = req.body
  db.prepare('UPDATE mitglied SET name=?, email=?, telefon=?, geburtstag=? WHERE id=?')
    .run(name, email, telefon ?? null, geburtstag ?? null, req.params.id)
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM warteliste WHERE mitglied_id = ?').run(id)
    db.prepare('DELETE FROM buchung WHERE mitglied_id = ?').run(id)
    db.prepare('DELETE FROM zahlung WHERE mitglied_id = ?').run(id)
    db.prepare('DELETE FROM mitgliedschaft WHERE mitglied_id = ?').run(id)
    db.prepare('DELETE FROM mitglied WHERE id = ?').run(id)
    db.exec('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    db.exec('ROLLBACK')
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
