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
