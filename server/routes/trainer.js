const express = require('express')
const db = require('../db/client')
const router = express.Router()

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, GROUP_CONCAT(tk.kurstyp_id) as kurstyp_ids
    FROM trainer t
    LEFT JOIN trainer_kurstyp tk ON tk.trainer_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `).all()
  res.json(rows)
})

router.get('/:id/kurstermine', (req, res) => {
  res.json(db.prepare(`
    SELECT k.*, kt.name as kurstyp_name, kt.format as kurstyp_format,
           (SELECT COUNT(*) FROM buchung WHERE kurstermin_id = k.id AND storniert_am IS NULL) as buchungen_count
    FROM kurstermin k
    JOIN kurstyp kt ON kt.id = k.kurstyp_id
    WHERE k.trainer_id = ?
    ORDER BY k.datum_zeit
  `).all(req.params.id))
})

// SPEC §3 Regel 14: Trainer sieht Teilnehmerliste nur für eigene Termine,
// kein Zugriff auf Zahlungen/volle Kontaktdaten (Server filtert Felder, nicht nur UI).
router.get('/:id/kurstermine/:kursterminId/teilnehmer', (req, res) => {
  const session = db.prepare('SELECT id, trainer_id FROM kurstermin WHERE id = ?').get(req.params.kursterminId)
  if (!session) return res.status(404).json({ error: 'Kurstermin nicht gefunden' })
  if (session.trainer_id !== Number(req.params.id)) {
    return res.status(403).json({ error: 'Kurstermin gehört nicht zu diesem Trainer' })
  }
  res.json(db.prepare(`
    SELECT b.id, b.storniert_am, b.erschienen, b.checkin_zeit, m.name as mitglied_name
    FROM buchung b
    JOIN mitglied m ON m.id = b.mitglied_id
    WHERE b.kurstermin_id = ?
    ORDER BY b.storniert_am IS NOT NULL, m.name
  `).all(req.params.kursterminId))
})

router.post('/', (req, res) => {
  const { name, anstellungsart, kurstyp_ids } = req.body
  const result = db.prepare('INSERT INTO trainer (name, anstellungsart) VALUES (?, ?)').run(name, anstellungsart)
  const id = Number(result.lastInsertRowid)
  if (kurstyp_ids?.length) {
    const ins = db.prepare('INSERT OR IGNORE INTO trainer_kurstyp (trainer_id, kurstyp_id) VALUES (?, ?)')
    for (const ktId of kurstyp_ids) ins.run(id, ktId)
  }
  res.status(201).json({ id })
})

router.put('/:id', (req, res) => {
  const { name, anstellungsart, kurstyp_ids } = req.body
  db.prepare('UPDATE trainer SET name=?, anstellungsart=? WHERE id=?').run(name, anstellungsart, req.params.id)
  db.prepare('DELETE FROM trainer_kurstyp WHERE trainer_id = ?').run(req.params.id)
  if (kurstyp_ids?.length) {
    const ins = db.prepare('INSERT INTO trainer_kurstyp (trainer_id, kurstyp_id) VALUES (?, ?)')
    for (const ktId of kurstyp_ids) ins.run(req.params.id, ktId)
  }
  res.json({ ok: true })
})

module.exports = router
