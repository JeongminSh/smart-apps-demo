const db = require('../db/client')
const { sendNachruecken } = require('./mail')
const { verteileZoomLink } = require('./zoomlink')

function advanceWaitlist(kurstermin_id) {
  const session = db.prepare(`
    SELECT k.*, kt.name as kurstyp_name FROM kurstermin k
    JOIN kurstyp kt ON kt.id = k.kurstyp_id WHERE k.id = ?
  `).get(kurstermin_id)
  if (!session) return

  const active = db.prepare('SELECT COUNT(*) as n FROM buchung WHERE kurstermin_id = ? AND storniert_am IS NULL').get(kurstermin_id).n
  if (active >= session.kapazitaet) return

  const next = db.prepare(`
    SELECT w.*, m.name as mitglied_name, m.email as mitglied_email
    FROM warteliste w JOIN mitglied m ON m.id = w.mitglied_id
    WHERE w.kurstermin_id = ? ORDER BY w.position LIMIT 1
  `).get(kurstermin_id)
  if (!next) return

  const cancelled = db.prepare('SELECT id FROM buchung WHERE mitglied_id = ? AND kurstermin_id = ? AND storniert_am IS NOT NULL').get(next.mitglied_id, kurstermin_id)
  if (cancelled) {
    db.prepare('UPDATE buchung SET storniert_am=NULL, gebucht_am=? WHERE id=?').run(new Date().toISOString(), cancelled.id)
  } else {
    db.prepare('INSERT INTO buchung (mitglied_id, kurstermin_id, gebucht_am) VALUES (?, ?, ?)').run(next.mitglied_id, kurstermin_id, new Date().toISOString())
  }

  db.prepare('DELETE FROM warteliste WHERE id=?').run(next.id)
  db.prepare('UPDATE warteliste SET position=position-1 WHERE kurstermin_id=? AND position>?').run(kurstermin_id, next.position)

  const datum = session.datum_zeit.slice(0, 16).replace('T', ' ')
  sendNachruecken(next.mitglied_email, next.mitglied_name, session.kurstyp_name, datum).catch(() => {})
  verteileZoomLink(kurstermin_id, next.mitglied_id)
}

module.exports = { advanceWaitlist }
