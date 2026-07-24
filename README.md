# FitZone

Kursbuchungs- und Mitgliederverwaltung für FitZone (SB52.2 Smart Application, 5. Semester).

Details zu Entitäten, Geschäftsregeln und Priorisierung: [#SPEC.md](#SPEC.md). Architektur und Tech-Stack: [docs/architecture.md](docs/architecture.md).

## Voraussetzungen

- Node.js v22.5 oder neuer (Backend nutzt das eingebaute `node:sqlite`-Modul)
- npm

## Setup

### 1. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env
```

`.env` bei Bedarf anpassen:

```
PORT=3000
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM=FitZone <noreply@fitzone.local>
```

Ohne `MAIL_HOST` bzw. mit den Ethereal-Defaults läuft der Mailversand gegen [Ethereal](https://ethereal.email) (Test-SMTP, keine echten Zustellungen). Beim Versand wird dann eine Vorschau-URL in der Server-Konsole geloggt.

Datenbank initialisieren (legt `server/db/fitzone.db` aus `schema.sql` an):

```bash
node db/init.js
```

Optional: realistische Testdaten laden (Mitglieder, Trainer, Kurstermine, Buchungen inkl. Warteliste- und No-Show-Testszenarien). Löscht vorher bestehende Daten in diesen Tabellen:

```bash
node db/seed.js
```

Server starten:

```bash
npm run dev     # mit nodemon (Auto-Reload)
# oder
npm start
```

Läuft standardmäßig auf `http://localhost:3000`, API unter `/api/v1/*`.

### 2. Frontend (`client/`)

```bash
cd client
npm install
npm run dev
```

Vite-Dev-Server läuft standardmäßig auf `http://localhost:5173` und spricht das Backend auf Port 3000 an.

## Verwendetes KI-Tool

Dieses Projekt wurde mit **Claude Code** (Anthropic) unter Verwendung des Modells **Claude Sonnet 5** entwickelt.
