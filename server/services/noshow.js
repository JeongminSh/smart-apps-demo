const db = require('../db/client')
const { sendBuchungssperre } = require('./mail')

const SPERRE_TAGE = 14
const SPERRE_SCHWELLE = 3

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function recordCheckin(buchungId) {
  const b = db.prepare('SELECT * FROM buchung WHERE id = ?').get(buchungId)
  if (!b) return { error: 'not_found' }
  db.prepare('UPDATE buchung SET erschienen=1, checkin_zeit=? WHERE id=?').run(new Date().toISOString(), buchungId)
  db.prepare('UPDATE mitglied SET no_show_zaehler=0 WHERE id=?').run(b.mitglied_id)
  return { ok: true }
}

// SPEC §3 Regel 18: 3 aufeinanderfolgende No-Shows ohne Absage -> 2 Wochen Sperre
function recordNoShow(buchungId) {
  const b = db.prepare('SELECT * FROM buchung WHERE id = ?').get(buchungId)
  if (!b) return { error: 'not_found' }
  if (b.storniert_am) return { error: 'storniert' }

  db.prepare('UPDATE buchung SET erschienen=0 WHERE id=?').run(buchungId)

  const member = db.prepare('SELECT * FROM mitglied WHERE id = ?').get(b.mitglied_id)
  const count = member.no_show_zaehler + 1

  if (count >= SPERRE_SCHWELLE) {
    const freiAb = addDays(new Date().toISOString().slice(0, 10), SPERRE_TAGE)
    db.prepare('UPDATE mitglied SET no_show_zaehler=0, gesperrt_bis=? WHERE id=?').run(freiAb, member.id)
    sendBuchungssperre(member.email, member.name, freiAb).catch(() => {})
  } else {
    db.prepare('UPDATE mitglied SET no_show_zaehler=? WHERE id=?').run(count, member.id)
  }
  return { ok: true }
}

module.exports = { recordCheckin, recordNoShow }
