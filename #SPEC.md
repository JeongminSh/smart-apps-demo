#SPEC.md - FitZone 

**Version: v1
Stand: nach Meeting #2
Interviewer: Jeongmin Shin

## 1. Entitäten

**Mitglied**
- ID, Name, Email, Telefon, Geburtstag (für Geburtstagsgruß)
- No-Show-Zähler (wie oft hintereinander nicht aufgetaucht)
- Gesperrt bis (leer wenn nicht gesperrt)

**Tarif**

| Tarif   | Preis | Buchungen / Monat      | Online               | Storno          |
| ------- | ----- | ---------------------- | -------------------- | --------------- |
| Basic   | 29€   | max. 5                 | nein                 | Standard        |
| Plus    | 49€   | mehr (Zahl noch offen) | ja, On-Demand-Videos | Standard        |
| Premium | 79€   | unbegrenzt             | ja, alles            | immer kostenlos |

**Mitgliedschaft**
- verbindet Mitglied mit einem Tarif
- Status: aktiv / pausiert / gekündigt
- Start- und Enddatum
- Pausezeitraum (von/bis), Pausentage verbraucht im laufenden Jahr
- SEPA-Mandat erteilt (ja/nein) + Datum
- Historie bleibt erhalten auch nach Kündigung

**Kurstyp**
- ID, Name (Yoga, Spinning, HIIT, Pilates...)
- Format: Studio oder Online
- Standard-Kapazität (Yoga 15, Spinning 12, HIIT bis 20)

**Kurstermin**
- konkrete Instanz eines Kurstyps
- Datum, Uhrzeit, Trainer
- Kapazität (kann vom Standard abweichen, ist dann bewusste Admin-Entscheidung)
- Status: geplant oder abgesagt
- Zoom-Link (nur Online)

**Buchung**
- welches Mitglied hat welchen Kurstermin gebucht
- Zeitstempel Buchung, Zeitstempel Stornierung
- Erschienen: ja/nein
- Check-in Zeitstempel
- gilt auch für Nachrücker von der Warteliste, kein Unterschied zur normalen Buchung

**Warteliste**
- welches Mitglied wartet auf welchen Kurstermin
- Position (Reihenfolge zählt)
- Zeitstempel Eintrag
- maximal 5 Plätze pro Kurstermin

**Trainer**
- ID, Name
- Anstellungsart: fest oder Honorar
- welche Kurstypen er leiten darf
- Zugang: eigene Termine + Teilnehmerlisten, kann Check-in machen
- kein Zugriff auf: Zahlungen, Gehälter anderer Trainer, volle Kontaktdaten der Kunden

**Zahlung**
- Mitglied, Betrag, Typ (Beitrag oder Stornogebühr)
- Datum, Status (bezahlt / offen)
- Stornogebühr wird automatisch beim nächsten SEPA-Einzug mit reingerechnet, keine eigene Transaktion

---

## 2. Beziehungen

- Mitglied → Mitgliedschaft: 1:n
- Mitgliedschaft → Tarif: n:1
- Mitglied → Buchung: 1:n
- Kurstermin → Buchung: 1:n
- Mitglied → Warteliste: 1:n
- Kurstermin → Warteliste: 1:n
- Kurstermin → Kurstyp: n:1
- Kurstermin → Trainer: n:1
- Trainer → Kurstyp: n:m (Trainer darf nur bestimmte Kurstypen)
- Mitglied → Zahlung: 1:n

**Explizite n:m (aufgelöst über Auflösungstabellen):**
- Mitglied ↔ Kurstermin: n:m, aufgelöst über Buchung
- Mitglied ↔ Kurstermin: n:m, aufgelöst über Warteliste

---

## 3. Geschäftsregeln

1. Kurs voll → Mitglied kommt automatisch auf Warteliste
2. Warteliste max. 5 Plätze pro Kurstermin
3. Warteliste ist geordnet, Position 1 rückt automatisch nach bei Absage
4. Nachrücken → automatische Push-Nachricht oder SMS, kein manueller Schritt
5. Nachrücker zählt wie normale Buchung, Nicht-Erscheinen danach ist normaler No-Show (sonst Missbrauch der Warteliste als Hintertür)
6. Kapazität ist pro Kurstyp fest, Änderung ist bewusste Admin-Entscheidung, schwankt nicht spontan
7. Online-Kurse technisch unbegrenzt, aber Lisa begrenzt bewusst (Chat-Qualität)
8. Stornierung kostenlos bis 2h vor Kursbeginn, danach 50% Stornogebühr
9. Stornogebühr wird automatisch beim nächsten SEPA-Einzug eingezogen, kein manueller Schritt mehr
10. Premium-Tarif → immer kostenlos stornieren
11. Tarif begrenzt Buchungen pro Monat (Basic 5, Plus mehr, Premium unbegrenzt)
12. Tarifwechsel: Upgrade kann Mitglied selbst, Downgrade nur Admin
13. Trainer darf nur Kurstypen leiten für die er qualifiziert ist
14. Trainer sieht nur eigene Termine + Teilnehmerlisten, keinen Zugriff auf Zahlungen/Gehälter/volle Kontaktdaten
15. Trainer kann Check-in selbst durchführen
16. Kursplanung läuft monatlich, macht Lisa als Admin
17. Kurs abgesagt → alle gebuchten Mitglieder automatisch benachrichtigt
18. 3 aufeinanderfolgende No-Shows ohne Absage → 2 Wochen Buchungssperre
19. Nach 2 Wochen automatisch wieder frei, Mitglied kriegt Benachrichtigung
20. Monatsbeitrag läuft per SEPA automatisch
21. Onboarding: Registrierung direkt im Studio (Tablet), SEPA digital, sofortiger Zugang, automatische Willkommens-Email
22. Mitgliedschaft pausiert → keine Beiträge, keine Buchungen, max. 3 Monate pro Kalenderjahr (kumulativ)
23. Pausieren wird nur vom Admin gesetzt, nicht vom Mitglied selbst
24. Kündigung: 4 Wochen zum Monatsende
25. Bestehende Buchungen bleiben gültig bis Ablauf der Kündigungsfrist, danach automatisch keine Buchungen mehr möglich
26. Nach Kündigung → kein Zugang, Online-Inhalte weg, automatisch
27. Online-Kurs → Zoom-Link nur an gebuchte Mitglieder, automatisch
28. Einzelkauf ohne Mitgliedschaft existiert nur als seltener manueller Bar-Sonderfall, kein App-Feature in v1
29. Aktuell nur 1 Standort, kein Multi-Standort-Feature in v1

---

## 4. Widersprüche

**W1: Storno-Regel hat faktisch keinen Zahn**
- Regel: 2h-Frist, danach 50% Stornogebühr, steht in AGB
- Realität: wird kaum durchgesetzt, weil der manuelle Prozess (ausrechnen, Steuerberater informieren) zu aufwändig ist. Lisa selbst: "die Regel hat faktisch keinen Zahn"
- Auflösung: App berechnet automatisch und zieht beim nächsten SEPA-Einzug mit ein

**W2: No-Show-Sperre nur im Kopf**
- Regel existiert (3x No-Show = 2 Wochen Sperre), aber Lisa trackt es manuell und nach Sympathie
- Auflösung: App zählt automatisch, Sperre greift ohne dass Lisa eingreift

**W3: Zugang nach Kündigung**
- Sollte sofort enden, aber Lisa vergisst den manuellen Schritt manchmal (Zoom-Link Beispiel)
- Auflösung: App deaktiviert Zugang automatisch zum Enddatum

**W4: Wartelisten-Größe (gelöst in Meeting 2)**
- War in Meeting 1 noch unklar
- Geklärt: maximal 5 Plätze pro Kurstermin

---

## 5. Prioritäten v1

**Muss rein (Lisas eigene Worte: die drei Dinge die täglich Nerven kosten)**
1. Wer hat gebucht
2. Wer ist auf der Warteliste
3. Wer taucht nie auf (No-Show-Tracking)
4. Onboarding direkt im Studio, Tablet-Registrierung, automatische Willkommens-Email (Lisa: "Riesenunterschied zu heute")
5. Automatische Stornogebühr-Berechnung beim SEPA-Einzug

**Nice to have, kann warten (v2+)**
- QR-Code Check-in
- Admin-Auslastungsübersicht
- Anstellungsart Trainer sichtbar
- Tagespass / Probeabo für Nicht-Mitglieder
- Multi-Standort-Buchung (explizit Zukunftsmusik laut Lisa, "keine Mega-Architekturen")
- Trainer-Level Sichtbarkeit (Anfänger vs. erfahren)

---

## 6. Offene Fragen

1. Genaue Buchungsgrenze für den Plus-Tarif (Lisa sagte nur "mehr", keine konkrete Zahl)
2. Premium hat laut Lisa noch einen weiteren Vorteil, den sie nicht verraten hat ("erzähl ich euch ein anderes Mal")
