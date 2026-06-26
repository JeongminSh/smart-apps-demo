# CLAUDE.md — FitZone

## Projekt
Kursbuchungs- und Mitgliederverwaltung für FitZone (Lisa Sommer). Löst drei tägliche Schmerzpunkte: Buchungsübersicht, Warteliste und No-Show-Tracking — plus automatischer Stornogebühr-Einzug und digitalem Onboarding.

## Deadline
[TT.MM.JJJJ] — SB52.2 Smart Application, 5. Semester

## Was bauen wir?
→ Lies #SPEC.md (Entitäten, Geschäftsregeln, Prioritäten)
→ Lies docs/backlog.md (Feature-IDs + Status)

## Tech-Stack + Standards
→ Lies docs/architecture.md

## Architektur-Entscheidungen
→ Lies docs/decisions.md

## Arbeitsweise
→ Lies docs/modus-operandi.md

## Coding-Prinzipien (Karpathy-Regeln)

**1. Think Before Coding.** Annahmen explizit machen. Bei Mehrdeutigkeit Interpretationen aufzeigen statt zu raten. Wenn etwas unklar ist: stoppen und fragen. Wenn ein einfacherer Ansatz existiert: sagen.

**2. Simplicity First.** Minimum Code, der das Problem löst. Keine Features über das Gefragte hinaus. Keine Abstraktionen für Single-Use-Code. Keine "Flexibility", die nicht angefordert wurde. Wenn 200 Zeilen auch in 50 gehen: 50 schreiben.

**3. Surgical Changes.** Nur das anfassen, was nötig ist. Kein Drive-by-Refactoring. Existierenden Stil matchen. Im Zweifel: erwähnen statt machen.

**4. Goal-Driven Execution.** Erfolgskriterien vor Implementierung definieren. Bei Bugs: Test, der den Bug reproduziert, dann Fix bis Test grün. Bei Features: Akzeptanzkriterien als Checkliste.

## Coding-Konventionen
- Deutsche UI-Texte; Code (Variablen, Funktionen) auf Englisch
- API-Routen unter `/api/v1/`
- Datumsfelder: ISO 8601 als String (`YYYY-MM-DD` / `YYYY-MM-DDTHH:MM:SS`)
- Boolean in SQLite: `0` / `1` als INTEGER
- `fitzone.db` nicht in Git (`.gitignore`)
- v1: Nur 1 Standort, kein Multi-Standort
- Einzelkauf ohne Mitgliedschaft = kein App-Feature in v1
- Push/SMS in v1 = Email via Nodemailer; kein echtes SMS
- SEPA = simuliert; Zahlung wird als `status: bezahlt` gesetzt

## Gotchas / Bekannte Fallen
- Plus-Tarif: genaue monatliche Buchungsgrenze noch offen (Lisa sagte nur "mehr als 5") → Platzhalter, bis geklärt
- Premium hat noch einen unbekannten weiteren Vorteil → explizit nicht implementieren, bis Lisa es kommuniziert
- Warteliste max. 5 Plätze — nicht konfigurierbar in v1
- Stornogebühr: kein eigener Payment-Record, wird beim nächsten SEPA-Einzug addiert
