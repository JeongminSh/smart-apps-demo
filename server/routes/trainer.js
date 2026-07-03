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
  res.json(db.prepare('SELECT * FROM kurstermin WHERE trainer_id = ? ORDER BY datum_zeit').all(req.params.id))
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
