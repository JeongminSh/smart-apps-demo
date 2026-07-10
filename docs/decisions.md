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

## 2026-07-10 — offene_stornogebuehr auf mitglied + guarded ALTER TABLE in init.js (FZ-007)

**Kontext:** SPEC §3 Regel 8-10 verlangt, dass eine Stornogebühr (<2h vor Kursbeginn, 50%, Premium ausgenommen) bis zum nächsten SEPA-Einzug "aufläuft", statt sofort verbucht zu werden. Weder `mitglied` noch `mitgliedschaft` hatten dafür ein Feld — `schema.sql` nutzt überall `CREATE TABLE IF NOT EXISTS`, das bei bereits existierenden Tabellen keine Spalte nachträgt. Die lokale `fitzone.db` hat aber schon Testdaten, ein Neuanlegen der DB würde die verwerfen.

### Entscheidung
Neue Spalte `mitglied.offene_stornogebuehr REAL NOT NULL DEFAULT 0` in `schema.sql` (für Neuinstallationen) zusätzlich zu einer guarded `ALTER TABLE ... ADD COLUMN` in `server/db/init.js` (try/catch auf "duplicate column name"), damit `node server/db/init.js` sowohl auf einer frischen als auch auf einer bestehenden DB idempotent funktioniert, ohne Daten zu verlieren.

### Alternativen verworfen
- DB-Datei löschen und neu anlegen: hätte alle bisherigen Testdaten (Mitglieder, Buchungen, Kurstermine) vernichtet
- Eigenes Migrationsframework: massiv überdimensioniert für ein Projekt mit einer einzigen SQLite-Datei und keinem Deployment

### Konsequenzen
- Positiv: bestehende Dev-DB bleibt erhalten; `node server/db/init.js` bleibt der einzige Setup-Befehl (kein neuer Schritt in der Doku nötig)
- Risiko: wächst die Zahl solcher nachträglichen Spalten, wird `init.js` unübersichtlich — falls das passiert, richtiges Migrationstool (z.B. eine `migrations/`-Ordnerkonvention) einführen

---

## 2026-07-10 — sepa.js zieht offene_stornogebuehr selbst statt sie als Parameter zu erhalten (FZ-007)

**Kontext:** `services/sepa.js#einziehenMonatsbeitrag` und `POST /zahlungen/einzug` existierten bereits als Scaffolding mit einem `stornogebuehr`-Parameter, den der Aufrufer manuell mitgeben musste. SPEC Regel 9 sagt aber explizit "automatisch ... kein manueller Schritt mehr".

### Entscheidung
`einziehenMonatsbeitrag(mitgliedId, betrag)` liest `mitglied.offene_stornogebuehr` selbst aus der DB, addiert sie zum Beitrag, und setzt sie nach dem Einzug auf 0 zurück. Der `stornogebuehr`-Parameter entfällt komplett aus Funktion und Route.

### Alternativen verworfen
- Parameter beibehalten, Frontend/Aufrufer muss den Wert vorher per GET abfragen und mitschicken: genau der manuelle Schritt, den die SPEC ausschließt

### Konsequenzen
- Positiv: `POST /zahlungen/einzug` ist jetzt tatsächlich "kein manueller Schritt" für die Gebühr; FZ-008 (SEPA-Monatseinzug) muss beim Aufruf nur noch `mitglied_id` und `betrag` kennen
- Neutral: Route und Service sind an dieser Stelle enger gekoppelt an die `mitglied`-Tabelle — akzeptiert, da beide ohnehin im selben Bounded Context liegen

---

## 2026-07-10 — SEPA-Monatseinzug: idempotenter Interval-Check statt Datum-basiertem Scheduler (FZ-008)

**Kontext:** SPEC §3 Regel 20 verlangt automatischen monatlichen Beitragseinzug, ohne dass Lisa manuell etwas anstoßen muss. Es gibt keinen festen "Abrechnungstag" pro Mitglied (SPEC nennt keinen), und wie bei FZ-005 (`sperre.js`) gibt es keinen natürlichen Request-Trigger — niemand tut etwas, wenn ein neuer Monat beginnt.

### Entscheidung
`server/services/monatseinzug.js#pruefeMonatseinzug` läuft beim Serverstart und danach stündlich per `setInterval` (gleiches Muster wie `checkAbgelaufeneSperren`, FZ-005). Sie holt alle Mitgliedschaften mit `status='aktiv'` und `sepa_mandat=1`, die im laufenden Kalendermonat (`substr(datum,1,7)`) noch keine `zahlung` haben, und ruft für jede `einziehenMonatsbeitrag` auf. Die `NOT EXISTS`-Bedingung macht den Lauf idempotent: mehrfaches Prüfen im selben Monat (Serverneustart, mehrere Interval-Ticks) bucht nicht doppelt. Kein fester Abrechnungstag — wer im Monat noch nicht bezahlt hat, wird beim nächsten Check fällig, unabhängig vom Eintrittsdatum.

### Alternativen verworfen
- Abrechnung am Tag des `start_datum` (Jahrestag-Logik pro Mitglied): mehr Komplexität, SPEC verlangt keinen festen Stichtag
- Externer Cron-Job (System-Crontab, node-cron): unnötige Abhängigkeit für ein einzelnes Intervall in einem Dev-Server ohne Deployment

### Konsequenzen
- Positiv: kein manueller Trigger nötig; robust gegen Serverneustarts (Idempotenz durch `NOT EXISTS`); gleiche, bereits etablierte Mechanik wie FZ-005
- Risiko: läuft der Server einen ganzen Monat nicht, wird der übersprungene Monat nicht nachträglich abgerechnet (kein Backbilling) — in v1 akzeptiert, da Lisas Studio-Rechner durchgehend läuft

---

## 2026-07-10 — Trainer-Identität per Namensauswahl statt Login (FZ-009)

**Kontext:** SPEC verlangt einen eigenen Trainer-Zugang mit eingeschränkter Sicht (eigene Termine, Teilnehmerlisten, Check-in), aber es existiert in v1 kein Auth-System (kein Login irgendwo in der App — `/admin` und `/trainer` sind beide offene Routen). Der Trainer muss der App trotzdem mitteilen, wer er ist, um "eigene Termine" zu filtern.

### Entscheidung
`TrainerPage.jsx` zeigt bei fehlender Auswahl einen einfachen Namens-Picker ("Wer bist du?", Liste aller Trainer zum Antippen) — dieselbe Idee wie die Tablet-Kiosk-Auswahl aus FZ-006, nur ohne Formular. Die Auswahl wird in `localStorage` gemerkt (Trainer nutzt üblicherweise sein eigenes Gerät), mit "Wechseln"-Button zum Zurücksetzen.

### Alternativen verworfen
- Echtes Login-System (Passwort/PIN) einführen: deutlich größerer Scope, in keiner SPEC-Regel gefordert, widerspricht "Simplicity First" für v1
- Trainer-ID als URL-Parameter (`/trainer/2`): kein Unterschied in der Sicherheit, aber schlechtere UX (Trainer müsste sich eine URL merken statt zu tippen)

### Konsequenzen
- Positiv: kein Auth-Aufwand, konsistent mit dem Rest der App (auch Admin hat kein Login)
- Risiko: keine echte Absicherung — jeder am Gerät kann sich als jeder Trainer ausgeben. Für v1 (kleines Studio, ein Standort, vertrauensbasiert) akzeptiert; bei echtem Deployment müsste hier ein Login nachgerüstet werden

---

## 2026-07-10 — Teilnehmerliste für Trainer: eigener serverseitig gefilterter Endpunkt (FZ-009)

**Kontext:** SPEC §3 Regel 14 verlangt explizit, dass Trainer keinen Zugriff auf Zahlungen/volle Kontaktdaten der Kunden haben — anders als die generelle Auth-Losigkeit der App (siehe oben) ist das eine konkrete Datenminimierungs-Regel, kein reines Zugriffsproblem. Der bestehende `GET /buchungen?kurstermin_id=X` (von `TeilnehmerModal` im Admin genutzt) liefert `mitglied_email` und `tarif_name` mit — zu viel für die Trainer-Ansicht.

### Entscheidung
Neue Route `GET /trainer/:id/kurstermine/:kursterminId/teilnehmer`: prüft zuerst, dass der Kurstermin tatsächlich diesem Trainer gehört (403 sonst), und `SELECT`et dann nur `id, storniert_am, erschienen, checkin_zeit, mitglied_name` — kein Email-Feld, kein Tarif-JOIN. Die Datenminimierung passiert im SQL, nicht nur durchs Weglassen von Spalten im Frontend, damit die Netzwerk-Response selbst nichts Überflüssiges enthält.

### Alternativen verworfen
- Bestehenden `/buchungen`-Endpunkt mit einem `?ansicht=trainer`-Query-Flag wiederverwenden: hätte den Endpunkt mit Sonderfall-Logik für zwei Rollen vermischt, für einen einzigen zusätzlichen Read-Endpunkt nicht nötig
- Nur im Frontend die Spalten ausblenden: Response enthielte trotzdem Email/Tarif — verfehlt den Zweck der Regel

### Konsequenzen
- Positiv: Regel 14 ist strukturell erzwungen, nicht nur eine UI-Konvention; Check-in/No-Show laufen weiterhin über die bestehenden `PUT /buchungen/:id/checkin` bzw. `/no-show` Routen (kein Trainer-Ownership-Check dort, da diese schon von Admin genutzt werden und es keine Sessions gibt, um "wer ruft auf" zu unterscheiden)
- Neutral: minimale Duplikation zur `WITH_JOINS`-Query in `kurstermine.js` — akzeptiert, da die Feldmengen bewusst unterschiedlich sind

---

## 2026-07-10 — "3 Monate" Pause = 90 Tage (Annahme, nicht mit Lisa geklärt) (FZ-012)

**Kontext:** SPEC Regel 22 sagt "max. 3 Monate pro Kalenderjahr (kumulativ)", aber das Schema (`mitgliedschaft.pause_tage_jahr`, schon vor dieser Session angelegt) zählt in Tagen, nicht in Monaten. Anders als beim Plus-Tarif-Limit ist diese Ambiguität nicht in `#SPEC.md §6` als offene Frage vermerkt — Lisa hält "3 Monate" offenbar für eindeutig genug, nur die exakte Tageszahl ist technische Übersetzungsarbeit.

### Entscheidung
3 Monate = 90 Tage, als Konstante `PAUSE_TAGE_MAX` in `mitgliedschaften.js`. Kumulativ heißt: Summe aller Pausentage mit `pause_von` im selben Kalenderjahr darf 90 nicht überschreiten.

### Alternativen verworfen
- Exakte Kalendermonate zählen (z.B. 3× 30/31/28 Tage je nach Startmonat): unnötig kompliziert für einen internen Cap-Wert, den SPEC selbst nur als groben Rahmen nennt
- Vor Implementierung bei Lisa nachfragen: SPEC §6 listet diese Frage nicht als offen — im Gegensatz zum Plus-Tarif-Limit, wo explizit "Zahl noch offen" vermerkt ist. Eine Rückfrage für einen bereits als klar behandelten Wert hätte den Fortschritt unnötig blockiert

### Konsequenzen
- Positiv: Feature ist nutzbar, Grenze ist im Code an einer Stelle änderbar, falls Lisa einen anderen genauen Wert nennt
- Risiko: falls Lisa tatsächlich eine andere Zahl im Kopf hat (z.B. 92 oder exakt kalendarische Monate), muss `PAUSE_TAGE_MAX` angepasst werden — wie beim Plus-Tarif-Limit als Gotcha in `CLAUDE.md` vermerkt

---

## 2026-07-10 — Kumulatives Jahreslimit ohne neue Jahres-Spalte: pause_von als impliziter Jahresmarker (FZ-012)

**Kontext:** `pause_tage_jahr` muss sich jedes Kalenderjahr zurücksetzen, aber eine Mitgliedschaft-Zeile kann über mehrere Jahre hinweg bestehen (kein Tarifwechsel = keine neue Zeile), und es gibt keine separate Pause-Historientabelle.

### Entscheidung
Kein neues `pause_jahr`-Feld. Stattdessen: beim Prüfen eines neuen Pausenantrags wird `pause_tage_jahr` nur dann als "bereits verwendet" gezählt, wenn das gespeicherte `pause_von` (die letzte Pause) im selben Kalenderjahr liegt wie das neue `pause_von`. Liegt die letzte Pause in einem Vorjahr, gilt der Zähler implizit als 0.

### Alternativen verworfen
- Zusätzliche Spalte `pause_jahr`: hätte funktioniert, aber `pause_von` trägt dieselbe Information bereits redundant in sich — eine weitere Spalte nur für Buchhaltung ohne zusätzlichen Nutzen

### Konsequenzen
- Positiv: keine Schema-Migration nötig (im Gegensatz zu FZ-007); Reset "passiert von selbst" beim ersten Pausenantrag im neuen Jahr
- Risiko: Wird eine Mitgliedschaft z.B. 2027 pausiert und 2028 nie wieder, bleibt `pause_von` für immer auf 2027 stehen — kein Problem, da ein neuer Antrag ohnehin neu berechnet; rein informativ angezeigte Restanzeige im Admin-UI könnte in diesem Rand-fall leicht veraltet wirken, ist aber unkritisch

---

## 2026-07-10 — Vorzeitig beendete Pause: keine Rückerstattung der geplanten Tage (FZ-012)

**Kontext:** Wenn eine Pause z.B. für 30 Tage angelegt, aber nach 10 Tagen per "Fortsetzen" beendet wird — sollen die restlichen 20 Tage wieder gutgeschrieben werden?

### Entscheidung
Nein. `pause_tage_jahr` wird beim Anlegen der Pause in voller geplanter Länge gebucht und bei vorzeitiger Beendigung nicht neu berechnet.

### Alternativen verworfen
- Tatsächlich genutzte Tage nachträglich berechnen: erfordert zusätzliche Logik beim Beenden (heutiges Datum vs. geplantes `pause_bis`) für einen Fall, den Lisa laut SPEC nicht als Anforderung genannt hat

### Konsequenzen
- Positiv: einfache, vorhersagbare Buchführung — "gebucht ist gebucht"
- Risiko: in seltenen Fällen etwas strenger als nötig gegenüber dem Mitglied — akzeptiert für v1

---

## 2026-07-10 — Zugangssperre bei Kündigung: end_datum-gated statt sofort bei Status-Wechsel (FZ-013)

**Kontext:** `POST /buchungen` blockierte bisher (seit FZ-003-Scaffolding) jede Buchung sofort, sobald `mitgliedschaft.status === 'gekündigt'` war — unabhängig vom Datum. SPEC Regel 25 sagt aber explizit: "Bestehende Buchungen bleiben gültig bis Ablauf der Kündigungsfrist, danach automatisch keine Buchungen mehr möglich." Und `#SPEC.md` Widerspruch W3 stellt klar: "App deaktiviert Zugang automatisch **zum Enddatum**" — nicht sofort bei Kündigungs-Erklärung. Ein Mitglied, das kündigt, bleibt bis zum Ende der 4-Wochen-Frist normales zahlendes Mitglied.

### Entscheidung
Der Block in `POST /buchungen` prüft jetzt `heute > mitgliedschaft.end_datum` statt nur den Status. Zusätzlich wird während der laufenden Frist verhindert, dass ein Kurstermin *nach* `end_datum` gebucht wird (sonst könnte man sich für einen Termin anmelden, den man wegen der eigenen Kündigung gar nicht mehr wahrnehmen dürfte). `mitgliedschaft.status` bleibt dauerhaft `'gekündigt'` — keine weitere Statustransition nach Fristende, da laut vorheriger Entscheidung (FZ-001, Hard-Delete-Eintrag) "Historie bleibt erhalten" sich genau auf diesen gesetzten Status bezieht.

### Alternativen verworfen
- Bestehenden Sofort-Block beibehalten: widerspricht Regel 25 und W3 direkt — hätte gekündigten Mitgliedern während der bezahlten Kündigungsfrist den Zugang zu Unrecht sofort entzogen
- Neuer Zwischenstatus (z.B. `'gekündigt_aktiv'` / `'gekündigt_inaktiv'`): mehr Zustände als nötig — ein reiner Datumsvergleich zur Anfragezeit reicht aus

### Konsequenzen
- Positiv: Verhalten entspricht jetzt der SPEC; kein periodischer Check nötig (anders als FZ-005/008/012) — die Prüfung passiert live bei jeder Buchungsanfrage, es gibt keinen gespeicherten Zustand, der "kippen" müsste
- Risiko: bereits *vor* der Kündigung gebuchte Kurse mit Termin nach `end_datum` werden nicht automatisch storniert (siehe nächster Eintrag)

---

## 2026-07-10 — Keine automatische Stornierung bestehender Buchungen nach Kündigungsfrist (FZ-013)

**Kontext:** Ein Mitglied könnte vor der Kündigung bereits einen Kurs gebucht haben, dessen Termin nach dem (zum Kündigungszeitpunkt noch unbekannten) `end_datum` liegt. SPEC Regel 25 äußert sich nur zum *Anlegen neuer* Buchungen ("keine Buchungen mehr möglich"), nicht zum Schicksal solcher bereits bestehender Buchungen.

### Entscheidung
Keine Aktion — bestehende Buchungen, die zufällig nach `end_datum` liegen, bleiben unverändert in der Datenbank stehen. Kein automatisches Storno, keine SPEC-Regel verlangt es explizit.

### Alternativen verworfen
- Beim Kündigen automatisch alle Buchungen mit `datum_zeit > end_datum` stornieren (inkl. Warteliste-Nachrücken für den freiwerdenden Platz): zusätzliche Komplexität für einen Rand-Fall, den SPEC nicht fordert

### Konsequenzen
- Positiv: einfache, vorhersagbare Implementierung
- Risiko: in der Praxis sehr seltener Fall (Kündigung kurz nach einer weit vorausgebuchten Reservierung); für v1 akzeptiert, Admin kann so eine Buchung manuell im TeilnehmerModal stornieren

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
