# architecture.md — FitZone

_Datenmodell, Ordnerstruktur, Konventionen. Stand: 2026-06-26_

---

## Tech-Stack

| Komponente | Technologie | Begründung |
|-----------|-------------|------------|
| Frontend | React + Vite | Komponentenbasiert; Vite für schnellen Dev-Server |
| Backend | Node.js + Express | REST API; einfach, kein Framework-Overhead |
| Datenbank | SQLite (Dev) | Dateibasiert, kein Setup; ausreichend für 1-Standort-Betrieb in v1 |
| Hosting | localhost | Entwicklungsumgebung; kein Deployment in v1 |
| Benachrichtigungen | Nodemailer (Email) | Kein SMS in v1; Email für Nachrücken, No-Show-Sperre, Kursabsagen |
| SEPA | Simuliert | Kein echtes Payment-Gateway; SEPA-Einzug wird als "ausgelöst" markiert |

**Scope-Hinweise:**
- Kein SMS in v1 — überall wo SPEC "Push/SMS" sagt, liefert die App eine Email
- SEPA-Simulation: Zahlungen werden als `status: bezahlt` gesetzt, kein echter Einzug

---

## Ordnerstruktur

```
smart-apps-demo/
├── client/                  # React + Vite Frontend
│   ├── src/
│   │   ├── components/      # Wiederverwendbare UI-Komponenten
│   │   ├── pages/           # Route-Level-Komponenten (Admin, Trainer, Mitglied)
│   │   ├── api/             # Fetch-Wrapper für Backend-Calls
│   │   └── main.jsx
│   ├── index.html
│   └── vite.config.js
│
├── server/                  # Node.js + Express Backend
│   ├── routes/              # Express-Router pro Ressource
│   ├── db/
│   │   ├── schema.sql       # SQLite-Schema (einmalig anlegen)
│   │   └── fitzone.db       # SQLite-Datenbankdatei (nicht committen)
│   ├── services/
│   │   ├── mail.js          # Nodemailer-Wrapper
│   │   └── sepa.js          # SEPA-Simulation
│   └── index.js             # Express-Einstiegspunkt
│
├── docs/                    # Projektdokumentation
│   ├── prd.md
│   ├── backlog.md
│   ├── decisions.md
│   ├── architecture.md
│   └── modus-operandi.md
├── CLAUDE.md
└── #SPEC.md
```

---

## Datenbank-Schema (SQLite)

```sql
CREATE TABLE tarif (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,         -- 'Basic' | 'Plus' | 'Premium'
  preis   REAL NOT NULL,
  buchungen_pro_monat INTEGER,   -- NULL = unbegrenzt (Premium)
  online  INTEGER NOT NULL DEFAULT 0  -- 0 | 1
);

CREATE TABLE mitglied (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  telefon         TEXT,
  geburtstag      TEXT,          -- ISO-Datum YYYY-MM-DD
  no_show_zaehler INTEGER NOT NULL DEFAULT 0,
  gesperrt_bis    TEXT           -- ISO-Datum; NULL = nicht gesperrt
);

CREATE TABLE mitgliedschaft (
  id              INTEGER PRIMARY KEY,
  mitglied_id     INTEGER NOT NULL REFERENCES mitglied(id),
  tarif_id        INTEGER NOT NULL REFERENCES tarif(id),
  status          TEXT NOT NULL DEFAULT 'aktiv',  -- 'aktiv' | 'pausiert' | 'gekündigt'
  start_datum     TEXT NOT NULL,
  end_datum       TEXT,
  pause_von       TEXT,
  pause_bis       TEXT,
  pause_tage_jahr INTEGER NOT NULL DEFAULT 0,     -- kumulativ im Kalenderjahr
  sepa_mandat     INTEGER NOT NULL DEFAULT 0,     -- 0 | 1
  sepa_datum      TEXT
);

CREATE TABLE kurstyp (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,   -- 'Yoga' | 'Spinning' | 'HIIT' | 'Pilates' ...
  format            TEXT NOT NULL,   -- 'Studio' | 'Online'
  standard_kapazitaet INTEGER NOT NULL
);

CREATE TABLE trainer (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  anstellungsart  TEXT NOT NULL   -- 'fest' | 'Honorar'
);

CREATE TABLE trainer_kurstyp (
  trainer_id  INTEGER NOT NULL REFERENCES trainer(id),
  kurstyp_id  INTEGER NOT NULL REFERENCES kurstyp(id),
  PRIMARY KEY (trainer_id, kurstyp_id)
);

CREATE TABLE kurstermin (
  id          INTEGER PRIMARY KEY,
  kurstyp_id  INTEGER NOT NULL REFERENCES kurstyp(id),
  trainer_id  INTEGER NOT NULL REFERENCES trainer(id),
  datum_zeit  TEXT NOT NULL,        -- ISO-Datetime
  kapazitaet  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'geplant',  -- 'geplant' | 'abgesagt'
  zoom_link   TEXT                  -- nur Online-Kurse
);

CREATE TABLE buchung (
  id              INTEGER PRIMARY KEY,
  mitglied_id     INTEGER NOT NULL REFERENCES mitglied(id),
  kurstermin_id   INTEGER NOT NULL REFERENCES kurstermin(id),
  gebucht_am      TEXT NOT NULL,
  storniert_am    TEXT,
  erschienen      INTEGER,          -- NULL | 0 | 1
  checkin_zeit    TEXT,
  UNIQUE(mitglied_id, kurstermin_id)
);

CREATE TABLE warteliste (
  id              INTEGER PRIMARY KEY,
  mitglied_id     INTEGER NOT NULL REFERENCES mitglied(id),
  kurstermin_id   INTEGER NOT NULL REFERENCES kurstermin(id),
  position        INTEGER NOT NULL,
  eingetragen_am  TEXT NOT NULL,
  UNIQUE(mitglied_id, kurstermin_id)
);

CREATE TABLE zahlung (
  id          INTEGER PRIMARY KEY,
  mitglied_id INTEGER NOT NULL REFERENCES mitglied(id),
  betrag      REAL NOT NULL,
  typ         TEXT NOT NULL,   -- 'Beitrag' | 'Beitrag+Stornogebühr'
  datum       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'offen'  -- 'offen' | 'bezahlt'
);
```

---

## Konventionen

- **Datumsfelder:** ISO 8601 als Text in SQLite (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM:SS`)
- **Boolean in SQLite:** `0` / `1` als INTEGER
- **API-Präfix:** alle Routen unter `/api/v1/`
- **Sprache:** UI-Texte auf Deutsch; Code (Variablen, Funktionen) auf Englisch
- **`.db`-Datei:** nicht in Git committen — in `.gitignore` eintragen
- **Stornogebühr:** kein eigener Payment-Record; beim SEPA-Einzug als `Beitrag+Stornogebühr` addiert
- **Email statt SMS:** überall wo die SPEC "Push/SMS" nennt, liefert v1 eine Email via Nodemailer
