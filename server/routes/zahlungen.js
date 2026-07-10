const express = require('express')
const db = require('../db/client')
const { einziehenMonatsbeitrag } = require('../services/sepa')
const router = express.Router()

const WITH_MEMBER = `
  SELECT z.*, m.name as mitglied_name FROM zahlung z
  JOIN mitglied m ON m.id = z.mitglied_id
`

// GET /api/v1/zahlungen?mitglied_id=X
router.get('/', (req, res) => {
  const { mitglied_id } = req.query
  const rows = mitglied_id
    ? db.prepare(WITH_MEMBER + 'WHERE z.mitglied_id = ? ORDER BY z.datum DESC').all(mitglied_id)
    : db.prepare(WITH_MEMBER + 'ORDER BY z.datum DESC').all()
  res.json(rows)
})

// POST /api/v1/zahlungen/einzug  — SEPA-Simulation
router.post('/einzug', (req, res) => {
  const { mitglied_id, betrag } = req.body
  const zahlung = einziehenMonatsbeitrag(mitglied_id, betrag)
  res.status(201).json(zahlung)
})

module.exports = router
