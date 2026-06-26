# backlog.md — FitZone

_Stand: 2026-06-26 | Basis: SPEC.md v1_

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
| FZ-001 | Mitgliederverwaltung (CRUD + Tarife) | 1 | validated | SPEC.md §1, §3 | Kern-Entität; Tarife Basic/Plus/Premium |
| FZ-002 | Kursplanung durch Admin | 1 | validated | SPEC.md §3 Regel 16 | Lisa erstellt Kurstermine monatlich |
| FZ-003 | Buchungsverwaltung | 1 | validated | SPEC.md §5 Prio 1 | Wer hat gebucht; Tarif-Limit prüfen |
| FZ-004 | Warteliste mit automatischem Nachrücken | 1 | validated | SPEC.md §5 Prio 2 | Max. 5 Plätze; Push/SMS bei Nachrücken |
| FZ-005 | No-Show-Tracking + Buchungssperre | 1 | validated | SPEC.md §5 Prio 3 | 3x No-Show = 2 Wochen Sperre, automatisch |
| FZ-006 | Studio-Onboarding (Tablet + SEPA + Welcome-Email) | 1 | validated | SPEC.md §5 Prio 4 | Tablet-Registrierung im Studio; sofortiger Zugang |
| FZ-007 | Automatische Stornogebühr beim SEPA-Einzug | 1 | validated | SPEC.md §5 Prio 5 | 50%-Gebühr bei <2h Storno; kein eigener Payment-Record |
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
