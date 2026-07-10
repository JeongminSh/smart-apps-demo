const db = require('../db/client')
const { einziehenMonatsbeitrag } = require('./sepa')

// SPEC §3 Regel 20: Monatsbeitrag läuft automatisch per SEPA, kein manueller Schritt.
// Nur aktive Mitgliedschaften mit erteiltem SEPA-Mandat (Regel 22: pausiert = keine Beiträge).
// NOT EXISTS macht den Lauf idempotent — mehrfaches Prüfen im selben Monat bucht nicht doppelt.
function pruefeMonatseinzug() {
  const monat = new Date().toISOString().slice(0, 7)  // 'YYYY-MM'

  const faellig = db.prepare(`
    SELECT ms.mitglied_id, t.preis FROM mitgliedschaft ms
    JOIN tarif t ON t.id = ms.tarif_id
    WHERE ms.id = (SELECT id FROM mitgliedschaft WHERE mitglied_id = ms.mitglied_id ORDER BY id DESC LIMIT 1)
      AND ms.status = 'aktiv' AND ms.sepa_mandat = 1
      AND NOT EXISTS (
        SELECT 1 FROM zahlung z WHERE z.mitglied_id = ms.mitglied_id AND substr(z.datum, 1, 7) = ?
      )
  `).all(monat)

  for (const f of faellig) einziehenMonatsbeitrag(f.mitglied_id, f.preis)
}

module.exports = { pruefeMonatseinzug }
