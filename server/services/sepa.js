const db = require('../db/client')

// SEPA-Simulation: kein echter Einzug, Zahlung wird als 'bezahlt' markiert.
function einziehenMonatsbeitrag(mitgliedId, betrag, stornogebuehr = 0) {
  const gesamt = betrag + stornogebuehr
  const typ = stornogebuehr > 0 ? 'Beitrag+Stornogebühr' : 'Beitrag'
  const datum = new Date().toISOString().slice(0, 10)

  const stmt = db.prepare(
    'INSERT INTO zahlung (mitglied_id, betrag, typ, datum, status) VALUES (?, ?, ?, ?, ?)'
  )
  stmt.run(mitgliedId, gesamt, typ, datum, 'bezahlt')

  return { mitgliedId, betrag: gesamt, typ, datum, status: 'bezahlt' }
}

module.exports = { einziehenMonatsbeitrag }
