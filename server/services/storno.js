const db = require('../db/client')

const FRIST_STUNDEN = 2
const GEBUEHR_ANTEIL = 0.5

// SPEC §3 Regel 8-10: <2h vor Kursbeginn = 50% Stornogebühr, Premium immer kostenlos.
// Kein eigener Payment-Record — Gebühr läuft auf mitglied.offene_stornogebuehr auf,
// bis der nächste SEPA-Einzug sie automatisch mit abbucht (server/services/sepa.js).
function berechneUndBucheGebuehr(mitgliedId, session) {
  const membership = db.prepare(`
    SELECT ms.*, t.preis, t.name as tarif_name FROM mitgliedschaft ms
    JOIN tarif t ON t.id = ms.tarif_id
    WHERE ms.mitglied_id = ? ORDER BY ms.id DESC LIMIT 1
  `).get(mitgliedId)

  if (!membership || membership.tarif_name === 'Premium') return 0

  const stundenBisKurs = (new Date(session.datum_zeit) - new Date()) / (1000 * 60 * 60)
  if (stundenBisKurs >= FRIST_STUNDEN) return 0

  const gebuehr = Math.round(membership.preis * GEBUEHR_ANTEIL * 100) / 100
  db.prepare('UPDATE mitglied SET offene_stornogebuehr = offene_stornogebuehr + ? WHERE id = ?').run(gebuehr, mitgliedId)
  return gebuehr
}

module.exports = { berechneUndBucheGebuehr }
