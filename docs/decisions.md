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

## 2026-07-03 — Kurstyp nach Anlage eines Kurstermins nicht mehr änderbar (FZ-002)

**Kontext:** Im Bearbeiten-Modal für einen Kurstermin wäre ein Kurstyp-Wechsel technisch möglich, würde aber Inkonsistenz erzeugen: die gebuchten Mitglieder haben einen Yoga-Termin gebucht, nicht Spinning. Die Trainer-Qualifikationsfilterung würde ebenfalls nicht mehr passen.

### Entscheidung
`PUT /api/v1/kurstermine/:id` akzeptiert kein `kurstyp_id`-Feld. Das Bearbeiten-Modal zeigt den Kurstyp read-only an. Bei einem Fehler (falscher Kurstyp gewählt) muss der Termin abgesagt und neu angelegt werden.

### Alternativen verworfen
- Kurstyp editierbar + Warnung: zu viel Sonderfalllogik für einen seltenen Admin-Fehler

### Konsequenzen
- Positiv: keine Daten-Inkonsistenz bei bestehenden Buchungen
- Negativ: Admin muss bei Fehler neu anlegen — vertretbar, da Kurstyp das erste Pflichtfeld ist

---

## 2026-07-03 — Trainer-Kurstyp-Zuweisung als Replace-All bei PUT (FZ-002)

**Kontext:** Beim Bearbeiten eines Trainers werden seine Qualifikationen (trainer_kurstyp) neu gesetzt. Entweder: diff + patch (nur Änderungen), oder: delete all + re-insert.

### Entscheidung
Delete all + re-insert: `DELETE FROM trainer_kurstyp WHERE trainer_id = ?` gefolgt von Einzel-Inserts der neuen kurstyp_ids.

### Alternativen verworfen
- Diff-Patch (nur geänderte Zeilen): mehr Code, kein messbarer Vorteil bei dieser Datenmenge

### Konsequenzen
- Positiv: einfach, atomar, kein Drift zwischen UI-State und DB möglich
- Risiko: bei Netzwerkfehler zwischen DELETE und INSERT sind alle Qualifikationen weg — in v1 akzeptiert, kein Transaktionsschutz nötig (kurze synchrone Operation)

---

## 2026-07-03 — AdminPage als Single-File mit inline Tab-Komponenten (FZ-002)

**Kontext:** AdminPage wächst mit Tab-Navigation (Mitglieder, Kursplanung, Stammdaten). Entscheidung: separate Dateien pro Tab oder alles in AdminPage.jsx?

### Entscheidung
Alles in `AdminPage.jsx` (~300 Zeilen): MitgliederTab, KursplanungTab, StammdatenTab + KurstypenSection + TrainerSection als lokale Funktionskomponenten. Gemeinsame Helpers (Field, StatusBadge, styles) am Ende der Datei.

### Alternativen verworfen
- Separate Dateien pro Tab: mehr Import-Graph, keine echte Wiederverwendung der Tabs (sind Admin-only, keine Routen)

### Konsequenzen
- Positiv: eine Datei zu lesen/ändern für den gesamten Admin-Bereich
- Risiko: Datei wächst mit weiteren Admin-Features — falls >500 Zeilen, Aufteilung überdenken

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

## 2026-07-03 — Warteliste: auto-enqueue in POST /buchungen, advanceWaitlist bei Storno (FZ-004)

**Kontext:** SPEC §3 Regel 1: "Kurs voll → Mitglied kommt automatisch auf Warteliste". Entscheidung: Wohin gehört die Wartelisten-Logik — eigener Endpunkt oder integriert in POST /buchungen?

### Entscheidung
POST /buchungen prüft Kapazität zuletzt; wenn voll → fügt automatisch in `warteliste` ein statt 409 zurückzugeben. Antwort: 201 `{ waitlist: true, position: N }`. Frontend erkennt `waitlist: true` und zeigt grüne Meldung. Beim Storno (PUT /buchungen/:id/stornieren) wird `advanceWaitlist(kurstermin_id)` in `server/services/advance.js` aufgerufen — bucht Position-1-Eintrag, löscht ihn aus Warteliste, re-nummeriert restliche Positionen, sendet Email via `mail.js#sendNachruecken`. Kein Retry bei fehlender Mitgliedschaft/Sperre in v1 — Admin löst Ausnahmen manuell.

### Alternativen verworfen
- Warteliste nur manuell via POST /warteliste: SPEC sagt "automatisch", d.h. kein extra Klick für den Admin
- Trennung: 409 bei vollem Kurs, Frontend ruft dann POST /warteliste: ein Extra-Request, mehr Frontend-Logik ohne Gewinn
- advanceWaitlist in eigenem Scheduler/Cron: unnötige Komplexität — Trigger bei Storno ist der natürliche Moment

### Konsequenzen
- Positiv: SPEC-konformes Verhalten; kein manueller Schritt; re-numbering hält Positionen konsistent
- Risiko: Position-1-Person könnte inzwischen gesperrt/gekündigt sein → Nachrücken schlägt still fehl, verbleibt auf Warteliste — in v1 akzeptiert

---

## 2026-07-03 — Buchungsvalidierung: Reihenfolge und Tarif-Limit-Granularität (FZ-003)

**Kontext:** POST /buchungen muss mehrere Validierungsschritte durchlaufen (Termin existiert, Mitglied existiert, Sperre, Mitgliedschaftsstatus, Duplikat, Tarif-Limit, Kapazität). Reihenfolge und Fehlermeldungen sind UX-relevant.

### Entscheidung
Validierungsreihenfolge: Termin→Mitglied→Sperre→pausiert/gekündigt→Duplikat→Tarif-Limit→Kapazität. Tarif-Limit zählt aktive Buchungen im Kalendermonat des Kurstermins (nicht des Buchungsdatums) per `substr(datum_zeit, 1, 7)`. `buchungen_pro_monat = NULL` (Plus-Tarif) bedeutet unbegrenzt. Stornierte Buchungen für denselben Termin werden reaktiviert (UPDATE) statt neu inseriert, um den UNIQUE(mitglied_id, kurstermin_id) Constraint zu respektieren.

### Alternativen verworfen
- Tarif-Limit nach Buchungsdatum: verfehlt den Intent — Lisa meint Monat des Kurs-Stattfindens
- Kapazitätsprüfung vor Tarif-Limit: führt dazu, dass ein Limit-Fehler nur bei vollem Kurs auftritt — schlechtere UX

### Konsequenzen
- Positiv: klare, predictable Fehlermeldungen; Reaktivierung erlaubt Storno+Wiederbuchung
- Risiko: Reaktivierung setzt `gebucht_am` auf aktuelles Datum (Buchungshistorie leicht verfälscht) — in v1 akzeptiert

---

## 2026-07-03 — TeilnehmerModal in KursplanungTab (FZ-003)

**Kontext:** Admins brauchen eine Übersicht wer an einem Kurstermin teilnimmt, und die Möglichkeit, manuell Buchungen hinzuzufügen oder zu stornieren.

### Entscheidung
`TeilnehmerModal` als eigene Funktionskomponente in `AdminPage.jsx` zwischen KursplanungTab und StammdatenTab. Wird per `buchungsModal`-State in KursplanungTab gesteuert. Zeigt aktive Buchungen zuerst, stornierte ausgegraut. Quick-add-Formular zeigt nur Mitglieder, die noch nicht (aktiv) gebucht haben.

### Alternativen verworfen
- Eigene Route `/kursplanung/termine/:id`: kein React Router im Admin, alles in einer SPA-Seite
- Seitenleiste statt Modal: mehr Layout-Aufwand ohne UX-Vorteil

### Konsequenzen
- Positiv: konsistent mit dem Single-File-Muster aus FZ-002; geringer Pflegeaufwand
- Risiko: AdminPage.jsx wächst weiter (jetzt ~430 Zeilen) — falls >500 Zeilen, Aufteilung überdenken

---

## 2026-07-10 — No-Show-Sperre: stündlicher Interval-Check statt Request-Trigger (FZ-005)

**Kontext:** SPEC §3 Regel 19 verlangt, dass die Buchungssperre nach 2 Wochen automatisch aufgehoben wird und das Mitglied benachrichtigt wird. Das Aufheben selbst passiert implizit (die Sperre-Prüfung in `POST /buchungen` vergleicht `gesperrt_bis >= heute`, ein abgelaufenes Datum blockiert also ohnehin nicht mehr). Die Benachrichtigung braucht aber einen aktiven Trigger — anders als bei `advanceWaitlist` (FZ-004) gibt es hier keinen natürlichen Request-Moment, an dem irgendjemand etwas tut, wenn eine Sperre abläuft.

### Entscheidung
`server/services/sperre.js#checkAbgelaufeneSperren` läuft einmal beim Serverstart und danach per `setInterval` stündlich (`server/index.js`). Sie sucht Mitglieder mit `gesperrt_bis < heute`, setzt `gesperrt_bis = NULL` und verschickt `sendSperreFrei`.

### Alternativen verworfen
- Eigener Scheduler/Cron-Package (z.B. node-cron): unnötige Dependency für einen einzigen stündlichen Check
- Lazy-Check beim nächsten `GET /mitglieder`: Benachrichtigung würde nur verschickt, wenn zufällig jemand die Admin-Seite lädt — nicht zuverlässig genug für "automatisch"

### Konsequenzen
- Positiv: Sperre wird zuverlässig aufgehoben und gemeldet, unabhängig davon ob ein Request reinkommt
- Risiko: Server muss durchlaufen (kein Problem in v1, da `localhost`-Dev-Betrieb ohnehin dauerhaft läuft); bei einem Neustart kurz vor Ablauf verzögert sich die Benachrichtigung höchstens um die Downtime — in v1 akzeptiert

---

## 2026-07-10 — Eigener Onboarding-Endpunkt statt Wiederverwendung von mitglieder/mitgliedschaften (FZ-006)

**Kontext:** SPEC §3 Regel 21 verlangt einen einzigen Tablet-Schritt: Registrierung, SEPA-Mandat und sofortiger Zugang inklusive automatischer Willkommens-Email. `POST /mitglieder` + `POST /mitgliedschaften` existieren bereits (genutzt vom Admin-CRUD in `AdminPage.jsx`), decken aber nicht "automatisch" ab — und `POST /mitgliedschaften` wird auch beim nachträglichen Zuweisen eines Tarifs zu einem bestehenden Mitglied (Admin-Edit) aufgerufen, wo eine Willkommens-Email fachlich falsch wäre.

### Entscheidung
Neue Route `POST /api/v1/onboarding` (`server/routes/onboarding.js`): legt `mitglied` + `mitgliedschaft` (Status `aktiv`, Startdatum heute, `sepa_mandat=1`) in einer Transaktion an und verschickt danach `sendWillkommen`. Nur für den Tablet-Flow gedacht — Admin-CRUD bleibt bei den bestehenden getrennten Endpunkten. `sepa_mandat` ist Pflichtfeld (400 wenn fehlt), da die Studio-Regel SEPA-Mandat und sofortigen Zugang bündelt. `MitgliedPage.jsx` (bisher ungenutzter Platzhalter-Catch-all) wird zum Tablet-Kiosk-Registrierungsformular.

### Alternativen verworfen
- Willkommens-Email in `POST /mitgliedschaften` einbauen: hätte auch bei Admin-Tarifzuweisungen an Bestandsmitglieder gefeuert — falsches Signal
- Frontend orchestriert 2 Requests (mitglieder + mitgliedschaften) + separater Email-Trigger: Email-Versand gehört serverseitig, kein Anlass für einen dritten Request

### Konsequenzen
- Positiv: ein atomarer Request für den kompletten Kiosk-Flow; Admin-Flows bleiben unangetastet
- Neutral: Duplizierte Insert-Logik zu `mitglieder.js`/`mitgliedschaften.js` (kein Wiederverwenden der Handler) — akzeptiert, da die Validierungsregeln (SEPA-Pflicht, sofort aktiv) bewusst unterschiedlich zum Admin-Pfad sind

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
