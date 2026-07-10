const db = require('../db/client')
const { sendZoomLink } = require('./mail')

// SPEC §3 Regel 27: Online-Kurs -> Zoom-Link automatisch, nur an gebuchte Mitglieder.
// Wird sowohl bei direkter Buchung als auch bei Nachrücken von der Warteliste ausgelöst
// (Regel 5: Nachrücker zählt wie normale Buchung, kein Unterschied).
function verteileZoomLink(kurstermin_id, mitglied_id) {
  const session = db.prepare(`
    SELECT k.*, kt.name as kurstyp_name, kt.format as kurstyp_format FROM kurstermin k
    JOIN kurstyp kt ON kt.id = k.kurstyp_id WHERE k.id = ?
  `).get(kurstermin_id)
  if (!session || session.kurstyp_format !== 'Online' || !session.zoom_link) return

  const member = db.prepare('SELECT name, email FROM mitglied WHERE id = ?').get(mitglied_id)
  if (!member) return

  const datum = session.datum_zeit.slice(0, 16).replace('T', ' ')
  sendZoomLink(member.email, member.name, session.kurstyp_name, datum, session.zoom_link).catch(() => {})
}

module.exports = { verteileZoomLink }
