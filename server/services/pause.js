const db = require('../db/client')

// Kein expliziter SPEC-Trigger wie "automatisch wieder aktiv" (anders als Regel 19
// bei der No-Show-Sperre), aber pause_bis wäre sonst ein totes Datum ohne Wirkung —
// gleiches periodisches Muster wie checkAbgelaufeneSperren (FZ-005).
function checkAbgelaufenePausen() {
  const heute = new Date().toISOString().slice(0, 10)
  db.prepare("UPDATE mitgliedschaft SET status='aktiv' WHERE status='pausiert' AND pause_bis < ?").run(heute)
}

module.exports = { checkAbgelaufenePausen }
