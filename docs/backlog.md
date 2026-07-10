# backlog.md — FitZone

_Stand: 2026-07-03 | Basis: SPEC.md v1_

_Stabile Feature-IDs. Nicht umnummerieren. Killed-IDs bleiben killed._

---

## Konvention

- **ID-Schema:** `FZ-NNN`
- **Prefix:** FZ (FitZone) — nie ändern
- **Nummerierung:** fortlaufend, nie wiederverwendet (auch nicht bei `killed`)
- **Referenzierung:** In Commits, PRs immer per ID — `feat: FZ-001 ...`

## Status-Werte

| Status | Bedeutung |
|--------|-----------|
| `hypo` | Hypothese, noch nicht mit Nutzerin validiert |
| `validated` | Mit Lisa bestätigt, aber noch kein Code |
| `in-progress` | Aktuell in Arbeit |
| `done` | Implementiert |
| `killed` | Verworfen — Begründung in `decisions.md` |

---

## Features

| ID | Name | Phase | Status | Quelle | Notiz |
|----|------|-------|--------|--------|-------|
| FZ-001 | Mitgliederverwaltung (CRUD + Tarife) | 1 | done | SPEC.md §1, §3 | CRUD + Tarif-Zuweisung; routes: mitglieder/mitgliedschaften/tarife; AdminPage; commit: e0982fb |
| FZ-002 | Kursplanung durch Admin | 1 | done | SPEC.md §3 Regel 16 | Kurstypen/Trainer/Kurstermine CRUD; Trainer-Filterung; Tab-Nav in AdminPage; commit: 06491cf |
| FZ-003 | Buchungsverwaltung | 1 | done | SPEC.md §5 Prio 1 | Validierung (Sperre/Tarif-Limit/Kapazität/Status); Teilnehmerliste; api.js Fehlermeldungen; commit: 9427c9b |
| FZ-004 | Warteliste mit automatischem Nachrücken | 1 | done | SPEC.md §5 Prio 2 | Auto-Enqueue bei vollem Kurs; advanceWaitlist bei Storno; Email via mail.js; re-numbering; commit: d4ba6bf |
| FZ-005 | No-Show-Tracking + Buchungssperre | 1 | done | SPEC.md §5 Prio 3 | Check-in/No-Show-Buttons in TeilnehmerModal; noshow.js sperrt bei 3x in Folge; sperre.js hebt Sperre stündlich automatisch auf + Email; commit: 5c02f0e |
| FZ-006 | Studio-Onboarding (Tablet + SEPA + Welcome-Email) | 1 | done | SPEC.md §5 Prio 4 | Neue Route POST /api/v1/onboarding (Mitglied+Mitgliedschaft+SEPA-Mandat atomar); MitgliedPage.jsx als Tablet-Kiosk-Formular; sendWillkommen; commit: 4abbd67 |
| FZ-007 | Automatische Stornogebühr beim SEPA-Einzug | 1 | done | SPEC.md §5 Prio 5 | storno.js berechnet 50%-Gebühr bei <2h/Premium-Ausnahme, sammelt in mitglied.offene_stornogebuehr; sepa.js zieht sie automatisch beim nächsten Einzug ab und setzt zurück |
| FZ-008 | SEPA-Monatseinzug | 1 | validated | SPEC.md §3 Regel 20 | Automatisch; Stornogebühr addiert |
| FZ-009 | Trainer-Zugang (Termine + Teilnehmerliste + Check-in) | 1 | validated | SPEC.md §1 Trainer | Kein Zugriff auf Zahlungen/Gehälter/volle Kontaktdaten |
| FZ-010 | Kursabsage mit automatischer Benachrichtigung | 1 | validated | SPEC.md §3 Regel 17 | Alle gebuchten Mitglieder automatisch informiert |
| FZ-011 | Online-Kurs Zoom-Link-Verteilung | 1 | validated | SPEC.md §3 Regel 27 | Nur an gebuchte Mitglieder, automatisch |
| FZ-012 | Mitgliedschaft pausieren | 1 | validated | SPEC.md §3 Regel 22–23 | Nur Admin; max. 3 Monate/Kalenderjahr |
| FZ-013 | Mitgliedschaft kündigen + Zugang-Deaktivierung | 1 | validated | SPEC.md §3 Regel 24–26 | 4 Wochen zum Monatsende; auto Deaktivierung |
| FZ-014 | QR-Code Check-in | 2 | hypo | SPEC.md §5 Nice-to-have | v2+, nach stabilem Betrieb |
| FZ-015 | Admin-Auslastungsübersicht | 2 | hypo | SPEC.md §5 Nice-to-have | v2+ |
| FZ-016 | Tagespass / Probeabo für Nicht-Mitglieder | 2 | hypo | SPEC.md §5 Nice-to-have | v2+ |
| FZ-017 | Multi-Standort | — | killed | SPEC.md §4 | Lisa: "keine Mega-Architekturen" — explizit out of scope |

---

## Workflow

**Neues Feature aus Session/Idee:**
1. Nächste freie ID vergeben
2. Zeile eintragen (Status `hypo`)
3. In Commit-Message per `FZ-NNN` referenzieren

**Feature validiert:**
- `hypo` → `validated`; Notiz: wer/wann bestätigt

**Feature in Arbeit:**
- `validated` → `in-progress`; Branch-Name in Notiz

**Feature fertig:**
- `in-progress` → `done`; Commit-Hash in Notiz

**Feature verworfen:**
- Status → `killed`; Eintrag in `decisions.md`; ID bleibt stehen

---

_Roadmap-Sicht = diese Tabelle gefiltert nach Phase._
