const db = require('../db/client')
const { sendKursabsage } = require('./mail')

// SPEC §3 Regel 17: Kurs abgesagt -> alle gebuchten Mitglieder automatisch benachrichtigt
function benachrichtigeAbsage(kurstermin_id) {
  const session = db.prepare(`
    SELECT k.*, kt.name as kurstyp_name FROM kurstermin k
    JOIN kurstyp kt ON kt.id = k.kurstyp_id WHERE k.id = ?
  `).get(kurstermin_id)
  if (!session) return

  const gebucht = db.prepare(`
    SELECT m.name as mitglied_name, m.email as mitglied_email
    FROM buchung b JOIN mitglied m ON m.id = b.mitglied_id
    WHERE b.kurstermin_id = ? AND b.storniert_am IS NULL
  `).all(kurstermin_id)

  const datum = session.datum_zeit.slice(0, 16).replace('T', ' ')
  for (const g of gebucht) {
    sendKursabsage(g.mitglied_email, g.mitglied_name, session.kurstyp_name, datum).catch(() => {})
  }
}

module.exports = { benachrichtigeAbsage }
