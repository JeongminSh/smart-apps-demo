// SPEC §3 Regel 24: Kündigungsfrist 4 Wochen zum Monatsende.
// Reines Datums-Arithmetik über Date.UTC, um Zeitzonen-Verschiebungen zu vermeiden
// (kein Mischen von String-geparsten und lokal konstruierten Date-Objekten).
function letzterTagDesMonats(jahr, monatNull) {
  return new Date(Date.UTC(jahr, monatNull + 1, 0)).toISOString().slice(0, 10)
}

function berechneKuendigungsEnddatum(heuteStr) {
  const [jahr, monat, tag] = heuteStr.split('-').map(Number)
  const monatNull = monat - 1
  const endeAktuellerMonat = letzterTagDesMonats(jahr, monatNull)

  const heuteMs = Date.UTC(jahr, monatNull, tag)
  const [endJahr, endMonat, endTag] = endeAktuellerMonat.split('-').map(Number)
  const endeMs = Date.UTC(endJahr, endMonat - 1, endTag)
  const diffTage = Math.round((endeMs - heuteMs) / 86400000)

  return diffTage >= 28 ? endeAktuellerMonat : letzterTagDesMonats(jahr, monatNull + 1)
}

module.exports = { berechneKuendigungsEnddatum }
