const db = require('../db/client')
const { sendSperreFrei } = require('./mail')

// SPEC §3 Regel 19: nach Ablauf automatisch wieder frei + Benachrichtigung.
// Kein Request-Trigger wie bei advanceWaitlist verfügbar (niemand tut etwas,
// wenn die Sperre abläuft) -> periodischer Check, siehe index.js.
function checkAbgelaufeneSperren() {
  const heute = new Date().toISOString().slice(0, 10)
  const abgelaufen = db.prepare('SELECT * FROM mitglied WHERE gesperrt_bis IS NOT NULL AND gesperrt_bis < ?').all(heute)
  for (const m of abgelaufen) {
    db.prepare('UPDATE mitglied SET gesperrt_bis=NULL WHERE id=?').run(m.id)
    sendSperreFrei(m.email, m.name).catch(() => {})
  }
}

module.exports = { checkAbgelaufeneSperren }
