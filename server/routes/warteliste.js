const express = require('express')
const db = require('../db/client')
const router = express.Router()

const WITH_MEMBER = `
  SELECT w.*, m.name as mitglied_name, m.email as mitglied_email
  FROM warteliste w JOIN mitglied m ON m.id = w.mitglied_id
`

router.get('/', (req, res) => {
  const { kurstermin_id } = req.query
  if (kurstermin_id) {
    return res.json(db.prepare(WITH_MEMBER + 'WHERE w.kurstermin_id = ? ORDER BY w.position').all(kurstermin_id))
  }
  res.json(db.prepare(WITH_MEMBER + 'ORDER BY w.kurstermin_id, w.position').all())
})

router.post('/', (req, res) => {
  const { mitglied_id, kurstermin_id } = req.body

  const session = db.prepare('SELECT id FROM kurstermin WHERE id = ? AND status = ?').get(kurstermin_id, 'geplant')
  if (!session) return res.status(404).json({ error: 'Kurstermin nicht gefunden oder abgesagt' })

  const alreadyBooked = db.prepare('SELECT id FROM buchung WHERE mitglied_id = ? AND kurstermin_id = ? AND storniert_am IS NULL').get(mitglied_id, kurstermin_id)
  if (alreadyBooked) return res.status(409).json({ error: 'Mitglied hat diesen Termin bereits gebucht', code: 'bereits_gebucht' })

  const alreadyWaiting = db.prepare('SELECT id FROM warteliste WHERE mitglied_id = ? AND kurstermin_id = ?').get(mitglied_id, kurstermin_id)
  if (alreadyWaiting) return res.status(409).json({ error: 'Mitglied steht bereits auf der Warteliste', code: 'bereits_warteliste' })

  const count = db.prepare('SELECT COUNT(*) as n FROM warteliste WHERE kurstermin_id = ?').get(kurstermin_id).n
  if (count >= 5) return res.status(409).json({ error: 'Warteliste voll (max. 5)', code: 'warteliste_voll' })

  const position = count + 1
  const result = db.prepare('INSERT INTO warteliste (mitglied_id, kurstermin_id, position, eingetragen_am) VALUES (?, ?, ?, ?)').run(mitglied_id, kurstermin_id, position, new Date().toISOString())
  res.status(201).json({ id: Number(result.lastInsertRowid), position })
})

router.delete('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM warteliste WHERE id = ?').get(req.params.id)
  if (!entry) return res.status(404).json({ error: 'Wartelisten-Eintrag nicht gefunden' })

  db.prepare('DELETE FROM warteliste WHERE id = ?').run(entry.id)
  db.prepare('UPDATE warteliste SET position=position-1 WHERE kurstermin_id=? AND position>?').run(entry.kurstermin_id, entry.position)
  res.json({ ok: true })
})

module.exports = router
