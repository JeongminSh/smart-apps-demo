const express = require('express')
const db = require('../db/client')
const router = express.Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM tarif ORDER BY preis').all())
})

module.exports = router
