const express = require('express')
const db = require('../db/client')
const { einziehenMonatsbeitrag } = require('../services/sepa')
const router = express.Router()

// GET /api/v1/zahlungen?mitglied_id=X
router.get('/', (req, res) => {
  const { mitglied_id } = req.query
  const rows = mitglied_id
    ? db.prepare('SELECT * FROM zahlung WHERE mitglied_id = ? ORDER BY datum DESC').all(mitglied_id)
    : db.prepare('SELECT * FROM zahlung ORDER BY datum DESC').all()
  res.json(rows)
})

// POST /api/v1/zahlungen/einzug  — SEPA-Simulation
router.post('/einzug', (req, res) => {
  const { mitglied_id, betrag } = req.body
  const zahlung = einziehenMonatsbeitrag(mitglied_id, betrag)
  res.status(201).json(zahlung)
})

module.exports = router
