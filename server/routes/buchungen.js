const express = require('express')
const db = require('../db/client')
const { advanceWaitlist } = require('../services/advance')
const { recordCheckin, recordNoShow } = require('../services/noshow')
const router = express.Router()

const WITH_MEMBER = `
  SELECT b.*, m.name as mitglied_name, m.email as mitglied_email,
         t.name as tarif_name
  FROM buchung b
  JOIN mitglied m ON m.id = b.mitglied_id
  LEFT JOIN mitgliedschaft ms ON ms.id = (
    SELECT id FROM mitgliedschaft WHERE mitglied_id = m.id ORDER BY id DESC LIMIT 1
  )
  LEFT JOIN tarif t ON t.id = ms.tarif_id
`

router.get('/', (req, res) => {
  const { kurstermin_id } = req.query
  if (kurstermin_id) {
    // aktive zuerst, dann stornierte
    return res.json(db.prepare(WITH_MEMBER + 'WHERE b.kurstermin_id = ? ORDER BY b.storniert_am IS NOT NULL, b.gebucht_am').all(kurstermin_id))
  }
  res.json(db.prepare(WITH_MEMBER + 'ORDER BY b.gebucht_am DESC').all())
})

router.post('/', (req, res) => {
  const { mitglied_id, kurstermin_id } = req.body

  const session = db.prepare('SELECT * FROM kurstermin WHERE id = ?').get(kurstermin_id)
  if (!session) return res.status(404).json({ error: 'Kurstermin nicht gefunden' })
  if (session.status !== 'geplant') return res.status(409).json({ error: 'Kurstermin ist abgesagt', code: 'abgesagt' })

  const member = db.prepare('SELECT * FROM mitglied WHERE id = ?').get(mitglied_id)
  if (!member) return res.status(404).json({ error: 'Mitglied nicht gefunden' })

  const today = new Date().toISOString().slice(0, 10)
  if (member.gesperrt_bis && member.gesperrt_bis >= today) {
    return res.status(409).json({ error: `Buchungssperre aktiv bis ${member.gesperrt_bis}`, code: 'gesperrt' })
  }

  const membership = db.prepare(`
    SELECT ms.*, t.buchungen_pro_monat FROM mitgliedschaft ms
    JOIN tarif t ON t.id = ms.tarif_id
    WHERE ms.mitglied_id = ? ORDER BY ms.id DESC LIMIT 1
  `).get(mitglied_id)

  if (membership?.status === 'pausiert') {
    return res.status(409).json({ error: 'Mitgliedschaft ist pausiert — keine Buchungen möglich', code: 'pausiert' })
  }
  if (membership?.status === 'gekündigt') {
    return res.status(409).json({ error: 'Mitgliedschaft ist gekündigt', code: 'gekündigt' })
  }

  const duplicate = db.prepare('SELECT id FROM buchung WHERE mitglied_id = ? AND kurstermin_id = ? AND storniert_am IS NULL').get(mitglied_id, kurstermin_id)
  if (duplicate) return res.status(409).json({ error: 'Mitglied hat diesen Termin bereits gebucht', code: 'bereits_gebucht' })

  // Stornierte Buchung reaktivieren statt neuen Row inserieren (UNIQUE-Constraint)
  const cancelled = db.prepare('SELECT id FROM buchung WHERE mitglied_id = ? AND kurstermin_id = ? AND storniert_am IS NOT NULL').get(mitglied_id, kurstermin_id)

  // Tarif-Limit: Buchungen im selben Kalendermonat wie der Kurstermin (Plus = NULL = unbegrenzt bis Lisa klärt)
  if (membership?.buchungen_pro_monat != null) {
    const month = session.datum_zeit.slice(0, 7)  // 'YYYY-MM'
    const used = db.prepare(`
      SELECT COUNT(*) as n FROM buchung b
      JOIN kurstermin k ON k.id = b.kurstermin_id
      WHERE b.mitglied_id = ? AND b.storniert_am IS NULL AND substr(k.datum_zeit, 1, 7) = ?
    `).get(mitglied_id, month).n
    if (used >= membership.buchungen_pro_monat) {
      return res.status(409).json({ error: `Monatslimit erreicht: ${used} von ${membership.buchungen_pro_monat} Buchungen in ${month} belegt`, code: 'tarif_limit' })
    }
  }

  const booked = db.prepare('SELECT COUNT(*) as n FROM buchung WHERE kurstermin_id = ? AND storniert_am IS NULL').get(kurstermin_id).n
  if (booked >= session.kapazitaet) {
    const alreadyWaiting = db.prepare('SELECT id FROM warteliste WHERE mitglied_id = ? AND kurstermin_id = ?').get(mitglied_id, kurstermin_id)
    if (alreadyWaiting) return res.status(409).json({ error: 'Mitglied steht bereits auf der Warteliste', code: 'bereits_warteliste' })
    const wlCount = db.prepare('SELECT COUNT(*) as n FROM warteliste WHERE kurstermin_id = ?').get(kurstermin_id).n
    if (wlCount >= 5) return res.status(409).json({ error: 'Kurs ist voll und Warteliste ist voll (max. 5)', code: 'warteliste_voll' })
    const position = wlCount + 1
    const wlResult = db.prepare('INSERT INTO warteliste (mitglied_id, kurstermin_id, position, eingetragen_am) VALUES (?, ?, ?, ?)').run(mitglied_id, kurstermin_id, position, new Date().toISOString())
    return res.status(201).json({ id: Number(wlResult.lastInsertRowid), waitlist: true, position })
  }

  if (cancelled) {
    db.prepare('UPDATE buchung SET storniert_am=NULL, gebucht_am=? WHERE id=?').run(new Date().toISOString(), cancelled.id)
    return res.status(201).json({ id: cancelled.id })
  }

  const result = db.prepare('INSERT INTO buchung (mitglied_id, kurstermin_id, gebucht_am) VALUES (?, ?, ?)').run(mitglied_id, kurstermin_id, new Date().toISOString())
  res.status(201).json({ id: Number(result.lastInsertRowid) })
})

router.put('/:id/stornieren', (req, res) => {
  const b = db.prepare('SELECT id, storniert_am, kurstermin_id FROM buchung WHERE id = ?').get(req.params.id)
  if (!b) return res.status(404).json({ error: 'Buchung nicht gefunden' })
  if (b.storniert_am) return res.status(409).json({ error: 'Buchung wurde bereits storniert' })
  // 2h-Frist und Stornogebühr: FZ-007
  db.prepare('UPDATE buchung SET storniert_am=? WHERE id=?').run(new Date().toISOString(), req.params.id)
  advanceWaitlist(b.kurstermin_id)
  res.json({ ok: true })
})

router.put('/:id/checkin', (req, res) => {
  const result = recordCheckin(req.params.id)
  if (result.error === 'not_found') return res.status(404).json({ error: 'Buchung nicht gefunden' })
  res.json(result)
})

router.put('/:id/no-show', (req, res) => {
  const result = recordNoShow(req.params.id)
  if (result.error === 'not_found') return res.status(404).json({ error: 'Buchung nicht gefunden' })
  if (result.error === 'storniert') return res.status(409).json({ error: 'Buchung wurde storniert' })
  res.json(result)
})

module.exports = router
