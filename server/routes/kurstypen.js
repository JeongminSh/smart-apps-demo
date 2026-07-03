const express = require('express')
const db = require('../db/client')
const router = express.Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM kurstyp ORDER BY name').all())
})

router.post('/', (req, res) => {
  const { name, format, standard_kapazitaet } = req.body
  const result = db.prepare(
    'INSERT INTO kurstyp (name, format, standard_kapazitaet) VALUES (?, ?, ?)'
  ).run(name, format, standard_kapazitaet)
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

router.put('/:id', (req, res) => {
  const { name, format, standard_kapazitaet } = req.body
  db.prepare('UPDATE kurstyp SET name=?, format=?, standard_kapazitaet=? WHERE id=?')
    .run(name, format, standard_kapazitaet, req.params.id)
  res.json({ ok: true })
})

module.exports = router
