const express = require('express')
const db = require('../db/client')
const router = express.Router()

router.post('/', (req, res) => {
  const { mitglied_id, tarif_id, start_datum, sepa_mandat, sepa_datum } = req.body
  const result = db.prepare(
    'INSERT INTO mitgliedschaft (mitglied_id, tarif_id, start_datum, sepa_mandat, sepa_datum) VALUES (?, ?, ?, ?, ?)'
  ).run(mitglied_id, tarif_id, start_datum, sepa_mandat ?? 0, sepa_datum ?? null)
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

router.put('/:id', (req, res) => {
  const { tarif_id, status } = req.body
  const current = db.prepare('SELECT * FROM mitgliedschaft WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Nicht gefunden' })
  db.prepare('UPDATE mitgliedschaft SET tarif_id=?, status=? WHERE id=?')
    .run(tarif_id ?? current.tarif_id, status ?? current.status, req.params.id)
  res.json({ ok: true })
})

module.exports = router
