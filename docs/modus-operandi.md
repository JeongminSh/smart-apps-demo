# Modus Operandi — FitZone (Solo)

_Arbeitsweise für dieses Projekt. Adaptiert von [jacekzawisza/modus-operandi](https://github.com/jacekzawisza/modus-operandi) für Solo-Betrieb._

---

## Grundprinzipien

- **Artefakte über Meetings** — undokumentierte Arbeit existiert nicht
- **Markdown als Single Source of Truth** — keine externen Tools erforderlich
- **Claude als Arbeitspartner** — alles dokumentiert für AI-Kontext-Extraktion
- **Output über Input** — Ergebnisse zählen, nicht Stunden

---

## Artefakt-Typen

| Datei | Zweck | Wann aktualisieren |
|-------|-------|-------------------|
| `CLAUDE.md` | AI-Briefing; erste Datei, die Claude liest | Bei Scope-Änderungen, neuen Gotchas |
| `#SPEC.md` | Anforderungen (Entitäten, Regeln, Prioritäten) — Read-only | Nur nach Kunden-Interview |
| `docs/backlog.md` | Feature-Registry mit stabilen IDs | Operativ — nach jeder Session |
| `docs/decisions.md` | Architektur- und Produktentscheidungen | Bei jeder nicht-trivialen Entscheidung |
| `docs/architecture.md` | Tech-Stack, Datenmodell, Konventionen | Bei Architektur-Änderungen |

---

## Session-Workflow (Solo)

### Vor der Session
1. `CLAUDE.md` öffnen — Kontext laden
2. `docs/backlog.md` prüfen — was ist `in-progress` oder `validated`?
3. Ziel der Session in 1 Satz definieren: "Heute baue ich FZ-003 Buchungsverwaltung bis..."

### Während der Session
- Claude bekommt bei Session-Start: `CLAUDE.md` + relevante `docs/`-Dateien
- Bei Entscheidungen: sofort in `docs/decisions.md` eintragen
- Commits: immer mit Feature-ID — `feat: FZ-003 Buchungsübersicht Admin-View`

### Nach der Session
- `docs/backlog.md` aktualisieren: Status, Branch/Commit-Hash
- Neue Erkenntnisse / Gotchas → in `CLAUDE.md` eintragen
- Offene Fragen → in `docs/decisions.md` oder direkt in `#SPEC.md §6`

---

## Commit-Konvention

```
<type>: FZ-NNN <kurze Beschreibung>

feat:   neues Feature
fix:    Bug-Fix
chore:  Infrastruktur, Dependencies
docs:   Dokumentation
```

---

## Was Claude beim Session-Start braucht

```
Lies CLAUDE.md, #SPEC.md und docs/backlog.md.
Heute: [Ziel der Session in 1 Satz].
Aktueller Stand: FZ-NNN ist [Status].
```

---

## Eskalationsregel (Solo)

Bei blockierenden Unklarheiten (Offene Fragen aus `#SPEC.md §6`, unklare Geschäftsregel):
→ Nicht raten, nicht implementieren
→ Frage in `#SPEC.md §6` dokumentieren
→ Beim nächsten Kunden-/Betreuerkontakt klären

---

_Quelle: [jacekzawisza/modus-operandi](https://github.com/jacekzawisza/modus-operandi), MIT License_
