const express = require('express')
const db = require('../db/client')
const { sendWillkommen } = require('../services/mail')
const router = express.Router()

// FZ-006: Tablet-Registrierung im Studio. Mitglied + Mitgliedschaft + SEPA-Mandat
// in einem Schritt, sofortiger Zugang, automatische Willkommens-Email.
router.post('/', (req, res) => {
  const { name, email, telefon, geburtstag, tarif_id, sepa_mandat } = req.body
  if (!name || !email || !tarif_id) {
    return res.status(400).json({ error: 'Name, E-Mail und Tarif sind erforderlich' })
  }
  if (!sepa_mandat) {
    return res.status(400).json({ error: 'SEPA-Mandat ist für die Registrierung erforderlich' })
  }

  const existing = db.prepare('SELECT id FROM mitglied WHERE email = ?').get(email)
  if (existing) return res.status(409).json({ error: 'Diese E-Mail ist bereits registriert' })

  const heute = new Date().toISOString().slice(0, 10)
  let mitgliedId
  db.exec('BEGIN')
  try {
    const m = db.prepare('INSERT INTO mitglied (name, email, telefon, geburtstag) VALUES (?, ?, ?, ?)')
      .run(name, email, telefon || null, geburtstag || null)
    mitgliedId = Number(m.lastInsertRowid)
    db.prepare('INSERT INTO mitgliedschaft (mitglied_id, tarif_id, start_datum, sepa_mandat, sepa_datum) VALUES (?, ?, ?, 1, ?)')
      .run(mitgliedId, tarif_id, heute, heute)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    return res.status(500).json({ error: err.message })
  }

  sendWillkommen(email, name).catch(() => {})
  res.status(201).json({ id: mitgliedId })
})

module.exports = router
