const express = require('express')
const db = require('../db/client')
const { berechneKuendigungsEnddatum } = require('../services/kuendigung')
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

const PAUSE_TAGE_MAX = 90  // SPEC Regel 22: max. 3 Monate/Kalenderjahr

// SPEC §3 Regel 22-23: nur Admin, max. 3 Monate/Kalenderjahr kumulativ.
// Kein Jahres-Reset-Feld nötig: pause_von trägt implizit das Jahr — liegt es
// nicht im laufenden Jahr, sind die bisherigen Tage aus einem Vorjahr und zählen nicht mit.
router.put('/:id/pausieren', (req, res) => {
  const { pause_von, pause_bis } = req.body
  if (!pause_von || !pause_bis) return res.status(400).json({ error: 'Von- und Bis-Datum sind erforderlich' })
  if (pause_bis < pause_von) return res.status(400).json({ error: 'Bis-Datum muss nach dem Von-Datum liegen' })

  const current = db.prepare('SELECT * FROM mitgliedschaft WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Nicht gefunden' })
  if (current.status !== 'aktiv') return res.status(409).json({ error: 'Nur aktive Mitgliedschaften können pausiert werden' })

  const neueTage = Math.round((new Date(pause_bis) - new Date(pause_von)) / 86400000) + 1
  const gleichesJahr = current.pause_von && new Date(current.pause_von).getFullYear() === new Date(pause_von).getFullYear()
  const bereitsVerwendet = gleichesJahr ? current.pause_tage_jahr : 0

  if (bereitsVerwendet + neueTage > PAUSE_TAGE_MAX) {
    const rest = PAUSE_TAGE_MAX - bereitsVerwendet
    return res.status(409).json({ error: `Pausenlimit überschritten: nur noch ${Math.max(rest, 0)} von ${PAUSE_TAGE_MAX} Tagen im Kalenderjahr verfügbar` })
  }

  db.prepare('UPDATE mitgliedschaft SET status=?, pause_von=?, pause_bis=?, pause_tage_jahr=? WHERE id=?')
    .run('pausiert', pause_von, pause_bis, bereitsVerwendet + neueTage, req.params.id)
  res.json({ ok: true })
})

router.put('/:id/fortsetzen', (req, res) => {
  const current = db.prepare('SELECT * FROM mitgliedschaft WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Nicht gefunden' })
  if (current.status !== 'pausiert') return res.status(409).json({ error: 'Mitgliedschaft ist nicht pausiert' })

  db.prepare("UPDATE mitgliedschaft SET status='aktiv' WHERE id=?").run(req.params.id)
  res.json({ ok: true })
})

// SPEC §3 Regel 24-26: 4 Wochen zum Monatsende, bestehende Buchungen bleiben bis
// end_datum gültig, danach automatisch kein Zugang mehr (Gate in buchungen.js).
// Status bleibt dauerhaft 'gekündigt' — Historie bleibt erhalten (siehe decisions.md).
router.put('/:id/kuendigen', (req, res) => {
  const current = db.prepare('SELECT * FROM mitgliedschaft WHERE id = ?').get(req.params.id)
  if (!current) return res.status(404).json({ error: 'Nicht gefunden' })
  if (current.status !== 'aktiv') return res.status(409).json({ error: 'Nur aktive Mitgliedschaften können gekündigt werden' })

  const end_datum = berechneKuendigungsEnddatum(new Date().toISOString().slice(0, 10))
  db.prepare("UPDATE mitgliedschaft SET status='gekündigt', end_datum=? WHERE id=?").run(end_datum, req.params.id)
  res.json({ ok: true, end_datum })
})

module.exports = router
