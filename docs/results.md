# results.md — FitZone v1

_Stand: 2026-07-16 | Basis: backlog.md, decisions.md, #SPEC.md_

Zusammenfassung des v1-Stands: was zuverlässig läuft, was noch fragil ist, und warum FZ-014 bis FZ-017 bewusst nicht in v1 sind.

---

## Was zuverlässig funktioniert

Alle Phase-1-Features (FZ-001 bis FZ-013) sind `done` und decken Lisas drei tägliche Schmerzpunkte plus Onboarding und Stornogebühr ab (siehe [backlog.md](backlog.md)):

- **Mitglieder- und Tarifverwaltung** (FZ-001) — CRUD inkl. Tarifwechsel, Hard-Delete mit Kaskade für DSGVO-Löschungen
- **Kursplanung** (FZ-002) — Kurstypen/Trainer/Kurstermine, Trainer-Qualifikationsfilterung
- **Buchungen** (FZ-003) — vollständige Validierungskette (Sperre → pausiert/gekündigt → Duplikat → Tarif-Limit → Kapazität), reproduzierbare Fehlermeldungen
- **Warteliste** (FZ-004) — automatisches Nachrücken bei Storno inkl. Re-Numbering und Email
- **No-Show-Tracking + Buchungssperre** (FZ-005) — automatische Sperre nach 3x Folge-No-Show, automatische Aufhebung nach 2 Wochen (stündlicher Check)
- **Studio-Onboarding** (FZ-006) — ein atomarer Tablet-Flow (Mitglied + Mitgliedschaft + SEPA-Mandat + Willkommens-Email)
- **Automatische Stornogebühr** (FZ-007) — läuft korrekt bis zum nächsten SEPA-Einzug auf und wird dort automatisch verrechnet
- **SEPA-Monatseinzug** (FZ-008) — idempotenter stündlicher Check, kein Doppel-Einzug bei Neustarts
- **Trainer-Zugang** (FZ-009) — datenminimierte Teilnehmerliste (kein Email-/Zahlungs-Feld in der Response), Check-in
- **Kursabsage-Benachrichtigung** (FZ-010), **Zoom-Link-Verteilung** (FZ-011)
- **Pausieren** (FZ-012) und **Kündigen** (FZ-013) inkl. fristgerechter Zugangssperre

Das Kernversprechen an Lisa — Buchungsübersicht, Warteliste, No-Show-Tracking laufen ohne manuellen Eingriff — ist erfüllt und in `docs/decisions.md` mit den jeweiligen Trade-offs dokumentiert.

---

## Was noch fragil ist

- **Keine automatisierten Tests.** Alle Features wurden manuell verifiziert, es existiert keine Test-Suite. Regressionen bei Änderungen an der Validierungskette (FZ-003) oder den Interval-Jobs (FZ-005/008) fallen nur bei manuellem Nachtesten auf.
- **Kein Auth-System.** Trainer-Identität läuft über Namensauswahl + `localStorage` (FZ-009), Admin-Bereich ist komplett offen. Für v1 (ein Standort, vertrauensbasiert) akzeptiert, aber jeder am Gerät kann sich als jeder Trainer ausgeben.
- **Zwei unbestätigte Annahmen mit Platzhaltern:**
  - Plus-Tarif-Buchungsgrenze: Lisa sagte nur "mehr als 5", keine konkrete Zahl (`#SPEC.md` §6, offene Frage 1) — Platzhalter im Code, muss vor Produktivbetrieb geklärt werden.
  - Pausenlimit "3 Monate" = 90 Tage (`PAUSE_TAGE_MAX` in `mitgliedschaften.js`, FZ-012) — technische Interpretation, nicht explizit mit Lisa verifiziert.
- **Interval-basierte Jobs setzen einen durchgehend laufenden Server voraus.** `checkAbgelaufeneSperren` (FZ-005) und `pruefeMonatseinzug` (FZ-008) laufen stündlich; fällt der Server für mehrere Tage aus, gibt es kein Backfilling — für v1-Dev-Betrieb auf `localhost` akzeptiert, würde bei echtem Deployment aber Nacharbeit brauchen.
- **Kein Transaktionsschutz bei Trainer-Qualifikationsupdate** (`trainer_kurstyp` Delete-all + Re-Insert) — bei Netzwerkfehler zwischen den beiden Schritten gehen alle Qualifikationen verloren.
- **Buchungs-Reaktivierung nach Storno** überschreibt `gebucht_am` mit dem aktuellen Datum — Buchungshistorie ist dadurch leicht verfälscht.
- **Keine automatische Stornierung** von Buchungen, die zufällig nach dem `end_datum` einer Kündigung liegen (FZ-013) — bleibt Admin-Handarbeit im Ausnahmefall.
- **`AdminPage.jsx` wächst** (~430 Zeilen, Single-File mit allen Tabs) — laut `decisions.md` bei >500 Zeilen aufzuteilen, aber noch nicht nötig.
- **Premium hat laut Lisa einen weiteren, nicht kommunizierten Vorteil** (`#SPEC.md` §6, offene Frage 2) — explizit nicht implementiert, bis sie ihn nennt.

---

## Warum FZ-014 bis FZ-016 bewusst v2+ sind

FZ-014 (QR-Code Check-in), FZ-015 (Admin-Auslastungsübersicht) und FZ-016 (Tagespass/Probeabo für Nicht-Mitglieder) stehen in `#SPEC.md` §5 explizit unter "Nice to have, kann warten (v2+)" — im Gegensatz zu den fünf Muss-Features, die Lisa selbst als die täglichen Schmerzpunkte benannt hat (Buchungsübersicht, Warteliste, No-Show, Onboarding, Stornogebühr).

Keines der drei löst eines dieser Schmerzpunkte:
- **QR-Code Check-in** ist eine Komfort-Verbesserung des bereits funktionierenden manuellen Check-ins (FZ-005/FZ-009), kein neues Problem.
- **Admin-Auslastungsübersicht** ist ein Reporting-Feature ohne operative Dringlichkeit — nichts, was Lisa täglich blockiert.
- **Tagespass/Probeabo** würde das Datenmodell um Nicht-Mitglieder-Käufe erweitern (SPEC Regel 28: "kein App-Feature in v1") und eine ganze neue Kategorie von Zahlungsfluss ohne Mitgliedschaft einführen — deutlich mehr Scope als ein inkrementelles Feature.

Alle drei bleiben Status `hypo` (Hypothese, noch nicht mit Lisa validiert) und wurden bewusst zurückgestellt, um zuerst den stabilen Betrieb der Muss-Features sicherzustellen (Karpathy-Regel "Simplicity First": kein Code für nicht angefragte Flexibilität).

---

## Warum FZ-017 (Multi-Standort) explizit out of scope ist

FZ-017 hat Status `killed`, nicht `hypo` — ein bewusster Architektur-Entscheid, kein zurückgestelltes Feature. Aus `docs/decisions.md` (2026-06-26):

- Lisa erwähnte eine mögliche Expansion, aber ohne konkreten Plan — Multi-Standort ist für sie "Zukunftsmusik" (`#SPEC.md` §5), keine v1-Anforderung.
- SPEC Regel 29 bestätigt: "Aktuell nur 1 Standort, kein Multi-Standort-Feature in v1."
- Eine schlanke Multi-Standort-Abstraktion von Anfang an (z.B. `studio_id` überall im Schema) wurde erwogen und verworfen: zu viel Komplexität ohne aktuellen Nutzen.
- Lisas eigene Vorgabe laut Interview: "keine Mega-Architekturen" — genau das würde eine vorzeitige Multi-Standort-Abstraktion bedeuten.

Konsequenz: das Datenmodell bleibt einfach (kein `studio_id`-Feld in keiner Tabelle). Ein späteres Nachrüsten kostet Aufwand, gilt aber als vertretbares Risiko, da Lisa selbst das Feature nicht als aktuellen Bedarf einstuft.
