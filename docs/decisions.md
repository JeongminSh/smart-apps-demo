# decisions.md — FitZone Architektur-Entscheidungen

_Chronologisches Log aller Architektur- und Produktentscheidungen._

---

<!-- Vorlage für neue Entscheidungen:

## JJJJ-MM-TT — Titel der Entscheidung

**Kontext:** Warum mussten wir entscheiden?

### Entscheidung
Was haben wir entschieden?

### Alternativen verworfen
- Option A: Warum nicht?
- Option B: Warum nicht?

### Konsequenzen
- Positiv
- Negativ / Risiken

-->

---

## 2026-06-26 — Multi-Standort aus v1 gekillt (FZ-017)

**Kontext:** Lisa erwähnte potenzielle Expansion, aber kein konkreter Plan.

### Entscheidung
Multi-Standort ist kein Feature in v1. FZ-017 = killed.

### Alternativen verworfen
- Thin Multi-Standort-Abstraktion von Anfang an: zu viel Komplexität ohne Nutzen heute

### Konsequenzen
- Positiv: einfacheres Datenmodell, kein `studio_id` überall
- Risiko: späteres Nachrüsten kostet Aufwand — vertretbar, weil Lisa es selbst als "Zukunftsmusik" bezeichnet

---

## 2026-07-03 — Hard Delete mit Kaskade statt Soft Delete (FZ-001)

**Kontext:** SPEC §3 Regel sagt "Historie bleibt erhalten auch nach Kündigung" — das bezieht sich aber auf die Kündigung (FZ-013, Mitgliedschaft-Status wird auf `gekündigt` gesetzt). Der Admin braucht trotzdem einen Weg, Datensätze vollständig zu löschen: Testdaten, DSGVO-Löschanfragen.

### Entscheidung
`DELETE /api/v1/mitglieder/:id` löscht das Mitglied und alle abhängigen Datensätze (buchung, warteliste, zahlung, mitgliedschaft) in einer SQLite-Transaktion (BEGIN/COMMIT/ROLLBACK).

### Alternativen verworfen
- Soft Delete mit `is_deleted`-Flag auf `mitglied`: zu früh eingeführt, FZ-013 deckt den normalen Kündigungsfall vollständig ab
- DELETE verbieten / nur per SQL: kein Weg für Admins, Testdaten zu bereinigen

### Konsequenzen
- Positiv: DSGVO-Löschung möglich; Testdaten bereinigbar
- Risiko: kein Undo — der Admin muss den Bestätigungsdialog im Frontend bewusst bestätigen

---

## 2026-07-03 — Aktuelle Mitgliedschaft per subquery (MAX id), kein is_current-Flag (FZ-001)

**Kontext:** Ein Mitglied kann mehrere Mitgliedschaft-Zeilen haben (Tarifwechsel-Historie, Wiedereintritt). `GET /mitglieder` muss die "aktuelle" Mitgliedschaft inkl. Tarif zurückgeben, ohne N+1-Queries.

### Entscheidung
LEFT JOIN auf die Mitgliedschaft mit der höchsten ID pro Mitglied:
```sql
LEFT JOIN mitgliedschaft ms ON ms.id = (
  SELECT id FROM mitgliedschaft WHERE mitglied_id = m.id ORDER BY id DESC LIMIT 1
)
```
Kein separates `is_current`-Flag.

### Alternativen verworfen
- `is_current`-Flag: erfordert bei jedem Tarifwechsel ein UPDATE auf der alten Zeile → Update-Anomalie-Risiko
- Filter auf `status = 'aktiv'`: versagt wenn Mitglied aktuell `pausiert` ist (wäre dann unsichtbar)

### Konsequenzen
- Positiv: kein Pflege-Overhead; funktioniert korrekt solange IDs autoincrement sind (immer der Fall)
- Risiko: bei manuellem Import ohne saubere IDs könnte die falsche Zeile gewählt werden — in v1 kein Thema

---

## 2026-07-03 — Mitgliedschaften als eigene Top-Level-Route, nicht nested (FZ-001)

**Kontext:** Mitgliedschaft ist eine eigene Ressource mit eigener ID. REST-Design-Frage: `/api/v1/mitglieder/:id/mitgliedschaft` (nested) oder `/api/v1/mitgliedschaften` (flat)?

### Entscheidung
Flat: `/api/v1/mitgliedschaften` als eigenständiger Router.

### Alternativen verworfen
- Nesting unter `/mitglieder/:id/mitgliedschaft`: macht `PUT` auf eine bestehende Mitgliedschaft umständlich (Pfad bräuchte sowohl mitglied_id als auch mitgliedschaft_id)

### Konsequenzen
- Positiv: einheitliche flache Struktur; passt zur Konvention der anderen Routen
- Neutral: Frontend muss die mitgliedschaft_id selbst mitführen — kommt aus dem JOIN-Ergebnis von GET /mitglieder

---

## 2026-06-26 — Stornogebühr als addierter Betrag, kein eigener Payment-Record

**Kontext:** Stornogebühr soll automatisch beim nächsten SEPA-Einzug eingezogen werden.

### Entscheidung
Stornogebühr wird nicht als eigene Zahlungstransaktion modelliert, sondern beim nächsten SEPA-Einzug zum Beitrag addiert. In der Zahlung-Tabelle: Typ "Beitrag+Stornogebühr" oder Betrag = Monatsbeitrag + aufgelaufene Gebühren.

### Alternativen verworfen
- Eigene Stornogebühr-Transaktion: nicht nötig, Lisa hat keinen Bedarf für separate Ausweisung im v1

### Konsequenzen
- Positiv: einfacheres Payment-Modell
- Risiko: weniger granulare Buchführung — für v1 akzeptiert

---
