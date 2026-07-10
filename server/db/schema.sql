-- FitZone SQLite Schema
-- Einmalig ausführen: node server/db/init.js

CREATE TABLE IF NOT EXISTS tarif (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL,
  preis   REAL NOT NULL,
  buchungen_pro_monat INTEGER,   -- NULL = unbegrenzt (Premium)
  online  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mitglied (
  id                    INTEGER PRIMARY KEY,
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  telefon               TEXT,
  geburtstag            TEXT,
  no_show_zaehler       INTEGER NOT NULL DEFAULT 0,
  gesperrt_bis          TEXT,
  offene_stornogebuehr  REAL NOT NULL DEFAULT 0   -- aufgelaufen, wird beim nächsten SEPA-Einzug addiert (FZ-007)
);

CREATE TABLE IF NOT EXISTS mitgliedschaft (
  id              INTEGER PRIMARY KEY,
  mitglied_id     INTEGER NOT NULL REFERENCES mitglied(id),
  tarif_id        INTEGER NOT NULL REFERENCES tarif(id),
  status          TEXT NOT NULL DEFAULT 'aktiv',
  start_datum     TEXT NOT NULL,
  end_datum       TEXT,
  pause_von       TEXT,
  pause_bis       TEXT,
  pause_tage_jahr INTEGER NOT NULL DEFAULT 0,
  sepa_mandat     INTEGER NOT NULL DEFAULT 0,
  sepa_datum      TEXT
);

CREATE TABLE IF NOT EXISTS kurstyp (
  id                  INTEGER PRIMARY KEY,
  name                TEXT NOT NULL,
  format              TEXT NOT NULL,   -- 'Studio' | 'Online'
  standard_kapazitaet INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trainer (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  anstellungsart  TEXT NOT NULL        -- 'fest' | 'Honorar'
);

CREATE TABLE IF NOT EXISTS trainer_kurstyp (
  trainer_id  INTEGER NOT NULL REFERENCES trainer(id),
  kurstyp_id  INTEGER NOT NULL REFERENCES kurstyp(id),
  PRIMARY KEY (trainer_id, kurstyp_id)
);

CREATE TABLE IF NOT EXISTS kurstermin (
  id          INTEGER PRIMARY KEY,
  kurstyp_id  INTEGER NOT NULL REFERENCES kurstyp(id),
  trainer_id  INTEGER NOT NULL REFERENCES trainer(id),
  datum_zeit  TEXT NOT NULL,
  kapazitaet  INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'geplant',  -- 'geplant' | 'abgesagt'
  zoom_link   TEXT
);

CREATE TABLE IF NOT EXISTS buchung (
  id              INTEGER PRIMARY KEY,
  mitglied_id     INTEGER NOT NULL REFERENCES mitglied(id),
  kurstermin_id   INTEGER NOT NULL REFERENCES kurstermin(id),
  gebucht_am      TEXT NOT NULL,
  storniert_am    TEXT,
  erschienen      INTEGER,
  checkin_zeit    TEXT,
  UNIQUE(mitglied_id, kurstermin_id)
);

CREATE TABLE IF NOT EXISTS warteliste (
  id              INTEGER PRIMARY KEY,
  mitglied_id     INTEGER NOT NULL REFERENCES mitglied(id),
  kurstermin_id   INTEGER NOT NULL REFERENCES kurstermin(id),
  position        INTEGER NOT NULL,
  eingetragen_am  TEXT NOT NULL,
  UNIQUE(mitglied_id, kurstermin_id)
);

CREATE TABLE IF NOT EXISTS zahlung (
  id          INTEGER PRIMARY KEY,
  mitglied_id INTEGER NOT NULL REFERENCES mitglied(id),
  betrag      REAL NOT NULL,
  typ         TEXT NOT NULL,   -- 'Beitrag' | 'Beitrag+Stornogebühr'
  datum       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'offen'
);

-- Seed: Tarife
INSERT OR IGNORE INTO tarif (id, name, preis, buchungen_pro_monat, online) VALUES
  (1, 'Basic',   29.00, 5,    0),
  (2, 'Plus',    49.00, NULL, 1),   -- genaue Grenze noch offen (SPEC §6)
  (3, 'Premium', 79.00, NULL, 1);
