const db = require('../db/client')

// SEPA-Simulation: kein echter Einzug, Zahlung wird als 'bezahlt' markiert.
// Aufgelaufene Stornogebühr (FZ-007) wird automatisch mit abgebucht und danach
// zurückgesetzt — kein manueller Schritt, kein eigener Payment-Record (SPEC Regel 9).
function einziehenMonatsbeitrag(mitgliedId, betrag) {
  const mitglied = db.prepare('SELECT offene_stornogebuehr FROM mitglied WHERE id = ?').get(mitgliedId)
  const stornogebuehr = mitglied?.offene_stornogebuehr ?? 0
  const gesamt = betrag + stornogebuehr
  const typ = stornogebuehr > 0 ? 'Beitrag+Stornogebühr' : 'Beitrag'
  const datum = new Date().toISOString().slice(0, 10)

  db.prepare('INSERT INTO zahlung (mitglied_id, betrag, typ, datum, status) VALUES (?, ?, ?, ?, ?)')
    .run(mitgliedId, gesamt, typ, datum, 'bezahlt')

  if (stornogebuehr > 0) {
    db.prepare('UPDATE mitglied SET offene_stornogebuehr = 0 WHERE id = ?').run(mitgliedId)
  }

  return { mitgliedId, betrag: gesamt, typ, datum, status: 'bezahlt' }
}

module.exports = { einziehenMonatsbeitrag }
