# AI Form Builder mit Claude Haiku

## 1. Ziel der Anwendung

Die Anwendung ist eine eigenständige Plattform, mit der Nutzer professionelle Onlineformulare erstellen, veröffentlichen und auswerten können.

Ein Nutzer soll ein Formular auf drei Wegen erstellen können:

1. über eine natürlichsprachliche Beschreibung,
2. aus einer Vorlage,
3. vollständig manuell.

Beispiel:

> Erstelle ein mehrstufiges Anfrageformular für eine Webagentur. Frage nach Unternehmen, Ansprechpartner, gewünschter Leistung, Budget und Projektstart. Interessenten mit einem Budget unter 2.000 Euro sollen eine andere Abschlussseite sehen.

Claude Haiku erzeugt daraus kein HTML und keine React-Komponenten, sondern eine validierte, strukturierte Formulardefinition. Diese Definition wird anschließend vom Form Builder geladen und kann vollständig manuell angepasst werden.

Die Anwendung muss den gesamten Lebenszyklus eines Formulars abdecken:

**Erstellen → Bearbeiten → Vorschau → Veröffentlichen → Ausfüllen → Auswerten**

---

# 2. Zielgruppe

Die Plattform richtet sich vor allem an:

- Agenturen
- Freelancer
- kleine Unternehmen
- Marketingteams
- Recruiter
- Veranstalter
- SaaS-Unternehmen
- interne Produktteams

Typische Anwendungsfälle:

- Kontaktformulare
- Lead-Qualifizierung
- Bewerbungsformulare
- Kunden-Onboarding
- Briefingformulare
- Umfragen
- Feedbackformulare
- Event-Anmeldungen
- Angebotsanfragen
- Support-Anfragen

Die Anwendung soll bewusst allgemeingültig sein und nicht nur einen einzelnen Formularzweck bedienen.

---

# 3. Zentraler Nutzerablauf

## Schritt 1: Anmeldung

Der Nutzer registriert sich oder meldet sich an.

Nach der Anmeldung landet er in einem Dashboard mit:

- vorhandenen Formularen
- Entwürfen
- veröffentlichten Formularen
- Anzahl der Antworten
- Conversion Rate
- letzter Bearbeitung
- Button „Neues Formular“

## Schritt 2: Formular erstellen

Beim Erstellen stehen drei Optionen zur Verfügung:

### Mit KI erstellen

Der Nutzer beschreibt das gewünschte Formular in einem Texteingabefeld.

Zusätzliche optionale Angaben:

- Ziel des Formulars
- Zielgruppe
- Sprache
- gewünschte Anzahl der Schritte
- Tonalität
- benötigte Pflichtfelder
- Art der Abschlussaktion

### Vorlage verwenden

Beispielsweise:

- Kontaktanfrage
- Projektbriefing
- Lead-Qualifizierung
- Bewerbung
- Event-Anmeldung
- Kundenzufriedenheit
- Newsletter-Anmeldung

### Leeres Formular

Der Nutzer startet mit einer leeren Seite und fügt Felder manuell hinzu.

## Schritt 3: Formular bearbeiten

Nach der Erstellung öffnet sich der visuelle Builder.

Der Nutzer kann:

- Felder hinzufügen
- Felder löschen
- Felder duplizieren
- Felder verschieben
- Seiten erstellen
- Validierungsregeln einstellen
- Bedingungen definieren
- Texte ändern
- Farben und Typografie anpassen

## Schritt 4: Vorschau

Das Formular kann direkt im Builder getestet werden:

- Desktop
- Tablet
- Smartphone
- verschiedene Antwortpfade
- Erfolgsmeldungen
- Validierungsfehler

Testantworten dürfen nicht in die produktiven Statistiken einfließen.

## Schritt 5: Veröffentlichung

Das Formular wird veröffentlicht und erhält:

- eine öffentliche URL
- einen konfigurierbaren Slug
- einen Embed-Code
- optional einen QR-Code

## Schritt 6: Antworten auswerten

Der Formularersteller sieht:

- einzelne Antworten
- zusammengefasste Statistiken
- Abbruchraten
- durchschnittliche Bearbeitungszeit
- häufig gewählte Antworten
- Exportmöglichkeiten

---

# 4. Dashboard

Das Dashboard ist die zentrale Formularverwaltung.

## Formularübersicht

Jede Formularkarte zeigt:

- Formularname
- Status
- Anzahl der Aufrufe
- Anzahl der gestarteten Formulare
- Anzahl der abgeschlossenen Formulare
- Conversion Rate
- letzte Bearbeitung
- Veröffentlichungsdatum

## Status

Ein Formular kann folgende Status besitzen:

- Entwurf
- veröffentlicht
- pausiert
- archiviert

## Aktionen

Für jedes Formular:

- öffnen
- umbenennen
- duplizieren
- Vorschau öffnen
- veröffentlichen
- pausieren
- archivieren
- löschen

## Suche und Filter

Formulare können gefiltert werden nach:

- Status
- Erstellungsdatum
- letzter Bearbeitung
- Anzahl der Antworten

Außerdem muss eine Volltextsuche über Formularnamen möglich sein.

---

# 5. Der visuelle Form Builder

Der Builder besteht aus drei Bereichen.

## Linke Seitenleiste

Hier befinden sich alle verfügbaren Elemente.

### Eingabefelder

- kurzer Text
- langer Text
- E-Mail
- Telefonnummer
- URL
- Zahl
- Datum
- Uhrzeit

### Auswahlfelder

- Einfachauswahl
- Mehrfachauswahl
- Dropdown
- Ja/Nein
- Bewertung
- Sternebewertung
- NPS-Skala

### Erweiterte Felder

- Datei-Upload
- Einwilligungs-Checkbox
- verstecktes Feld
- Überschrift
- Beschreibungstext
- Trennbereich

## Mittlerer Bereich

Hier wird das aktuelle Formular dargestellt.

Der Nutzer kann Felder per Drag-and-drop:

- hinzufügen
- neu anordnen
- zwischen Seiten verschieben
- gruppieren

Zusätzlich benötigt jedes Element Schnellaktionen:

- bearbeiten
- duplizieren
- löschen
- als Pflichtfeld markieren

## Rechte Seitenleiste

Hier werden die Eigenschaften des ausgewählten Elements bearbeitet.

Beispiel für ein E-Mail-Feld:

- interne Feldbezeichnung
- sichtbare Frage
- Beschreibung
- Platzhalter
- Pflichtfeld
- Fehlermeldung
- Standardwert
- Validierungsregeln
- bedingte Sichtbarkeit

---

# 6. Builder-Funktionen

## Drag-and-drop

Die Anwendung sollte `dnd-kit` für das Verschieben der Felder verwenden.

Unterstützt werden müssen:

- Sortieren innerhalb einer Seite
- Verschieben zwischen Seiten
- Einfügen an einer bestimmten Position
- visuelle Drop-Indikatoren
- Tastatursteuerung
- Rückgängigmachen einer Verschiebung

## Undo und Redo

Der Builder benötigt eine Änderungshistorie.

Der Nutzer muss mindestens folgende Aktionen rückgängig machen können:

- Feld hinzufügen
- Feld löschen
- Feld verschieben
- Texte ändern
- Optionen bearbeiten
- Seite hinzufügen
- Bedingung ändern

Dafür bietet sich intern ein Command- oder Snapshot-basiertes History-System an.

## Autosave

Änderungen werden automatisch gespeichert.

Empfohlen:

- lokale Aktualisierung sofort
- Speicherung nach kurzer Debounce-Zeit
- sichtbarer Status „Speichert …“
- sichtbarer Status „Gespeichert“
- Fehlerstatus mit Wiederholungsoption

Um Änderungen aus mehreren geöffneten Browser-Tabs nicht gegenseitig zu überschreiben, sollte jede Formularversion eine Revisionsnummer besitzen.

Beim Speichern sendet der Client beispielsweise:

- Formular-ID
- aktuelle Revision
- neue Formulardefinition

Der Server akzeptiert die Änderung nur, wenn die Revision noch aktuell ist.

## Duplizieren

Duplizierbar sein müssen:

- einzelne Felder
- komplette Seiten
- komplette Formulare

Beim Duplizieren müssen neue interne IDs erzeugt werden. IDs dürfen nicht von Claude generiert oder blind aus einer kopierten Definition übernommen werden.

---

# 7. Mehrstufige Formulare

Ein Formular kann aus einer oder mehreren Seiten bestehen.

Jede Seite enthält:

- interne ID
- optionale Überschrift
- optionale Beschreibung
- Liste der Felder
- Weiter-Button
- Zurück-Button
- optionale Bedingungen

Der Nutzer kann auswählen, ob:

- eine Frage pro Seite,
- mehrere Fragen pro Seite,
- oder das gesamte Formular auf einer Seite

dargestellt wird.

## Fortschrittsanzeige

Mögliche Varianten:

- Prozentanzeige
- Fortschrittsbalken
- „Schritt 2 von 5“
- keine Anzeige

Die Fortschrittsberechnung muss dynamische Pfade berücksichtigen. Übersprungene Seiten dürfen nicht als noch ausstehende Schritte erscheinen.

---

# 8. Conditional Logic

Bedingte Logik ist eine der wichtigsten Senior-Level-Funktionen des Projekts.

## Unterstützte Bedingungen

Abhängig vom Feldtyp:

- ist gleich
- ist nicht gleich
- enthält
- enthält nicht
- ist ausgefüllt
- ist nicht ausgefüllt
- ist größer als
- ist kleiner als
- ist vor einem Datum
- ist nach einem Datum
- Auswahl enthält Option

## Unterstützte Aktionen

Wenn eine Bedingung erfüllt ist:

- Feld anzeigen
- Feld ausblenden
- Seite anzeigen
- Seite überspringen
- zu einer bestimmten Seite springen
- Formular vorzeitig beenden
- bestimmte Abschlussseite anzeigen

## Beispiel

```text
Wenn Budget = „Unter 2.000 €“
→ Seite „Kleines Projekt“ anzeigen

Wenn Budget = „Über 10.000 €“
→ zusätzliche Fragen zum Projektumfang anzeigen

Wenn Leistung = „Onlineshop“
→ Fragen zu Produkten und Zahlungsarten anzeigen
```

## Verknüpfungen

Bedingungen müssen mit folgenden Operatoren kombinierbar sein:

- alle Bedingungen müssen erfüllt sein: AND
- mindestens eine Bedingung muss erfüllt sein: OR

## Technische Anforderungen

Die Anwendung benötigt eine zentrale Logic Engine, die sowohl vom Builder als auch vom öffentlichen Formular verwendet wird.

Diese Engine muss:

- Bedingungen deterministisch auswerten
- Schleifen verhindern
- ungültige Referenzen erkennen
- gelöschte Zielfelder behandeln
- nicht erreichbare Seiten erkennen
- Endlossprünge verhindern

Der Builder sollte vor der Veröffentlichung Warnungen anzeigen:

- „Diese Seite ist nicht erreichbar.“
- „Diese Regel verweist auf ein gelöschtes Feld.“
- „Die Regeln erzeugen einen zyklischen Ablauf.“
- „Für diesen Antwortpfad existiert keine Abschlussseite.“

---

# 9. Validierung

Jedes Feld kann eigene Validierungsregeln besitzen.

## Allgemeine Regeln

- Pflichtfeld
- minimale Länge
- maximale Länge
- eigener Fehlertext

## Textfelder

- erlaubte Zeichen
- regulärer Ausdruck
- E-Mail-Format
- URL-Format
- Telefonnummernformat

## Zahlenfelder

- minimaler Wert
- maximaler Wert
- Ganzzahl oder Dezimalzahl

## Auswahlfelder

- minimale Anzahl von Auswahlmöglichkeiten
- maximale Anzahl von Auswahlmöglichkeiten

## Datei-Upload

- erlaubte Dateitypen
- maximale Dateigröße
- maximale Anzahl Dateien

Die Validierungsdefinition muss Bestandteil des zentralen Formularschemas sein. Builder, Server und öffentlicher Renderer dürfen nicht jeweils unterschiedliche Validierungsregeln implementieren.

---

# 10. Theme Editor

Der Nutzer soll das Formular visuell anpassen können, ohne ein freies Page-Builder-System zu benötigen.

## Anpassbare Eigenschaften

- primäre Farbe
- Hintergrundfarbe
- Textfarbe
- Schriftart
- Schriftgröße
- Breite des Formularcontainers
- Abstände
- Eckenradius
- Button-Stil
- Feld-Stil
- Logo
- Hintergrundbild
- Fortschrittsanzeige

## Designsystem

Intern werden Theme Tokens gespeichert, beispielsweise:

- `colorPrimary`
- `colorBackground`
- `colorText`
- `fontFamily`
- `borderRadius`
- `containerWidth`
- `inputStyle`
- `buttonStyle`

Nicht jedes Element sollte beliebig mit Inline-Styles verändert werden. Ein tokenbasiertes System sorgt für konsistente Gestaltung und demonstriert Designsystem-Kompetenz.

## Barrierefreiheit

Der Theme Editor sollte warnen, wenn:

- Text und Hintergrund zu wenig Kontrast besitzen
- Buttons nicht eindeutig erkennbar sind
- Schriftgrößen zu klein gewählt wurden

Freies Custom CSS gehört nicht in die erste Version. Es erhöht Sicherheitsrisiken und macht eingebettete Formulare schwerer kontrollierbar.

---

# 11. KI-Integration mit Claude Haiku

## Modell

Verwendet wird:

```text
claude-haiku-4-5
```

Die Integration erfolgt über das offizielle TypeScript-Paket:

```text
@anthropic-ai/sdk
```

Der Anthropic API-Key darf ausschließlich serverseitig verwendet werden. Das offizielle SDK deaktiviert Browserzugriffe standardmäßig, damit geheime Zugangsdaten nicht versehentlich an den Client ausgeliefert werden.

## Aufgabe von Claude

Claude soll nicht die komplette Anwendung programmieren und auch kein JSX generieren.

Claude erzeugt eine Formulardefinition mit:

- Formulartitel
- Einleitung
- Seiten
- Fragen
- Feldtypen
- Auswahloptionen
- Pflichtfeldern
- Validierungen
- Bedingungen
- Abschlussseiten
- vorgeschlagenem Theme

## Strukturierte Ausgabe

Die Antwort von Claude sollte über `output_config.format` strikt an ein JSON-Schema gebunden werden. Anthropic beschreibt Structured Outputs als schema-validierte, parsebare JSON-Ausgaben, wodurch unter anderem fehlende Pflichtfelder und inkonsistente Datentypen vermieden werden.

Der Ablauf:

1. Nutzer sendet die Formularbeschreibung.
2. Next.js Route Handler prüft Authentifizierung und Rate Limit.
3. Der Server erstellt den Claude-Prompt.
4. Claude liefert eine JSON-Antwort nach vorgegebenem Schema.
5. Die Antwort wird zusätzlich mit Zod validiert.
6. Der Server entfernt unbekannte Eigenschaften.
7. Der Server erzeugt sichere IDs.
8. Das Formular wird als Entwurf gespeichert.
9. Der Builder öffnet die Formulardefinition.

## Warum doppelt validieren?

Obwohl Claude strukturierte Ausgaben liefert, muss die Anwendung weiterhin eigene fachliche Regeln prüfen.

Beispiele:

- maximal 50 Felder
- maximal 20 Auswahloptionen pro Feld
- keine doppelten Feld-IDs
- nur erlaubte Feldtypen
- keine Bedingungen auf nicht vorhandene Felder
- keine zyklischen Seitenverweise
- begrenzte Textlängen

Das JSON-Schema prüft die Form. Die eigene Domain-Validierung prüft die fachliche Logik.

## KI-Aktionen im Builder

Neben der vollständigen Generierung benötigt der Builder kontextbezogene KI-Aktionen:

- Frage umformulieren
- Frage kürzen
- Frage freundlicher formulieren
- Antwortoptionen vorschlagen
- zusätzliche Frage ergänzen
- Seite generieren
- Formular auf Zielgruppe anpassen
- Formular übersetzen
- Validierungsregeln vorschlagen
- bedingten Ablauf vorschlagen
- Abschlussseite generieren

Der Nutzer muss jede KI-Änderung vor der Übernahme sehen.

Eine gute Oberfläche zeigt:

- bisherigen Inhalt
- vorgeschlagenen Inhalt
- „Übernehmen“
- „Verwerfen“
- „Neu generieren“

## Teilweise Neugenerierung

Beim Bearbeiten eines einzelnen Feldes darf nicht jedes Mal das gesamte Formular an Claude gesendet und ersetzt werden.

Es braucht getrennte Endpunkte für:

- vollständiges Formular generieren
- einzelne Frage bearbeiten
- Antwortoptionen erzeugen
- Seite ergänzen
- Logik vorschlagen
- Formular übersetzen

## Prompt-Versionierung

Jede KI-Funktion besitzt:

- einen Namen
- eine Prompt-Version
- ein Eingabeschema
- ein Ausgabeschema
- eine maximale Token-Anzahl

Beispiel:

```text
generate-form:v1
rewrite-question:v1
generate-options:v1
translate-form:v1
suggest-logic:v1
```

Dadurch bleiben KI-Ergebnisse reproduzierbarer und spätere Prompt-Änderungen nachvollziehbar.

## Kosten- und Nutzungskontrolle

Pro KI-Anfrage sollten gespeichert werden:

- Nutzer-ID
- Workspace-ID
- Formular-ID
- Modell
- Funktion
- Prompt-Version
- Input Tokens
- Output Tokens
- Latenz
- Status
- Fehlercode

Anthropic bietet einen Token-Counting-Endpunkt, mit dem Eingabetokens vor einer Anfrage geschätzt werden können. Das ist sinnvoll, um sehr große Formularprompts frühzeitig abzulehnen oder zu kürzen.

Zusätzlich:

- Rate Limit pro Nutzer
- Rate Limit pro Workspace
- Tageslimit für Generierungen
- maximale Prompt-Länge
- begrenzte Anzahl paralleler Requests
- Retry mit Exponential Backoff bei temporären Fehlern

Bei einem Anthropic-Rate-Limit liefert die API einen HTTP-Status 429 und einen `retry-after`-Header. Dieser sollte vom Backend respektiert werden.

Prompt Caching ist für die erste Version nicht zwingend notwendig. Bei Claude Haiku 4.5 liegt die minimale cachebare Prompt-Länge laut Anthropic bei 4.096 Tokens. Es lohnt sich daher hauptsächlich, wenn dein Systemprompt und deine Schemainstruktionen entsprechend umfangreich und häufig identisch sind.

---

# 12. Zentrales Formularschema

Die Anwendung benötigt eine einzige kanonische Definition eines Formulars.

Konzeptionell enthält sie:

```text
FormDefinition
├── metadata
├── settings
├── theme
├── pages[]
│   ├── fields[]
│   └── navigation
├── conditions[]
├── endings[]
└── schemaVersion
```

## Metadata

- Titel
- Beschreibung
- Sprache
- Schema-Version

## Settings

- Fortschrittsanzeige
- Zurück-Button erlauben
- Antwortbearbeitung erlauben
- Mehrfachübermittlung erlauben
- Captcha aktivieren
- Abschlussverhalten

## Page

- ID
- Titel
- Beschreibung
- Reihenfolge
- Felder

## Field

- ID
- Typ
- interne Bezeichnung
- sichtbarer Text
- Beschreibung
- Platzhalter
- Pflichtfeld
- Optionen
- Validierung
- Standardwert

## Condition

- ID
- logischer Operator
- Regeln
- Aktion
- Ziel

## Ending

- ID
- Titel
- Beschreibung
- Button
- Weiterleitungs-URL

Das Schema sollte mit Zod definiert werden. Daraus können TypeScript-Typen abgeleitet werden, sodass Builder, API und Formularrenderer dieselbe Struktur verwenden.

---

# 13. Vorschau und Testmodus

Der Builder benötigt eine echte Vorschau des öffentlichen Formularrenderers.

Es darf nicht zwei getrennte Implementierungen geben:

- eine vereinfachte Builder-Vorschau
- einen anderen öffentlichen Renderer

Stattdessen sollte dieselbe Renderer-Komponente in verschiedenen Modi verwendet werden:

```text
mode="builder"
mode="preview"
mode="public"
```

## Testmodus

Im Testmodus kann der Ersteller:

- Formular ausfüllen
- Bedingungen testen
- Validierungen testen
- mobile Darstellung prüfen
- alle Abschlussseiten aufrufen
- aktuellen Antwortpfad anzeigen

Testantworten werden entweder nicht gespeichert oder eindeutig als Test markiert.

---

# 14. Veröffentlichung und Versionierung

## Entwurf und Veröffentlichung trennen

Ein veröffentlichtes Formular darf sich nicht sofort verändern, nur weil der Ersteller im Builder etwas bearbeitet.

Deshalb benötigt jedes Formular:

- aktuelle Entwurfsversion
- veröffentlichte Version
- Versionshistorie

Beim Veröffentlichen wird ein unveränderlicher Snapshot des aktuellen Entwurfs erstellt.

Neue Änderungen finden anschließend wieder am Entwurf statt.

## Versionshistorie

Der Nutzer kann:

- ältere Versionen ansehen
- Unterschiede nachvollziehen
- ältere Version wiederherstellen
- sehen, welche Version eine Antwort verwendet hat

Das ist wichtig, weil Antworten weiterhin anhand der ursprünglichen Felddefinition interpretierbar bleiben müssen.

---

# 15. Öffentliche Formulare

Jedes veröffentlichte Formular erhält eine URL, beispielsweise:

```text
app-domain.de/f/projektanfrage
```

## Anforderungen

- responsive Darstellung
- schnelle Ladezeit
- individuelle Meta-Daten
- Open-Graph-Daten
- Lade- und Fehlerzustände
- Tastaturbedienung
- Screenreader-Unterstützung
- Schutz vor Mehrfachübermittlung
- Schutz vor Bots
- Wiederaufnahme bei Verbindungsproblemen

## Formularsession

Beim Öffnen wird eine anonyme Session erzeugt.

Gespeichert werden können:

- Session-ID
- Formularversion
- Startzeitpunkt
- letzter aktiver Schritt
- Abschlusszeitpunkt
- Gerätetyp
- Referrer
- Kampagnenparameter

Personenbezogene Daten wie vollständige IP-Adressen sollten nicht standardmäßig gespeichert werden.

---

# 16. Embed-System

Die Anwendung muss einen Embed-Code erzeugen.

## Empfohlene Lösung

Die erste Version verwendet ein `iframe`.

Beispielhaft:

```html
<iframe
  src="https://app-domain.de/embed/formular-slug"
  width="100%"
  title="Projektanfrage"
></iframe>
```

Zusätzlich wird ein kleines Embed-Script angeboten, das:

- das iframe erzeugt
- Größenänderungen empfängt
- die Höhe automatisch anpasst
- erfolgreiche Übermittlungen als Event weitergibt

Die Kommunikation zwischen Formular und Host-Seite erfolgt über `postMessage`.

Mögliche Events:

```text
form.ready
form.started
form.stepChanged
form.submitted
form.resized
```

Das iframe verhindert weitgehend, dass Styles der einbettenden Website das Formular beeinflussen oder umgekehrt.

---

# 17. Antwortverwaltung

## Antwortübersicht

Für jedes Formular gibt es eine Tabelle mit:

- Eingangsdatum
- Status
- wichtigsten Antworten
- Bearbeitungszeit
- verwendeter Formularversion
- Quelle
- Gerät

## Antwortdetail

Die Detailansicht zeigt:

- alle Fragen und Antworten
- übersprungene Fragen
- Antwortpfad
- Start- und Abschlusszeitpunkt
- Metadaten
- hochgeladene Dateien

## Aktionen

- als gelesen markieren
- archivieren
- löschen
- interne Notiz hinzufügen
- einzelne Antwort exportieren

## Status

- begonnen
- teilweise ausgefüllt
- abgeschlossen
- Testantwort
- Spam
- archiviert

Teilweise Antworten können für die erste veröffentlichte Version noch deaktiviert bleiben. Views, Starts und Abbrüche sollten jedoch bereits über anonyme Events messbar sein.

---

# 18. Analytics

Das Analytics-Dashboard benötigt mindestens:

## Übersicht

- Formularaufrufe
- gestartete Sessions
- abgeschlossene Sessions
- Completion Rate
- durchschnittliche Bearbeitungszeit
- Abbruchrate

## Funnel

```text
Formular geöffnet
→ Formular gestartet
→ Schritt 2 erreicht
→ Schritt 3 erreicht
→ Formular abgeschlossen
```

## Fragenanalyse

Pro Frage:

- Anzahl der Aufrufe
- Anzahl der Antworten
- Übersprungrate
- Abbruchrate nach dieser Frage
- häufigste Antworten
- durchschnittliche Bearbeitungszeit

## Segmentierung

Filter nach:

- Zeitraum
- Gerät
- Quelle
- Kampagnenparameter
- Formularversion
- Abschlussseite

## KI-Auswertung

Optional kann Claude Haiku eine kompakte Zusammenfassung erzeugen:

> Die meisten Abbrüche treten bei der Budgetfrage auf. Nutzer auf Mobilgeräten benötigen dort im Durchschnitt deutlich länger. Prüfe, ob die Optionen klar genug formuliert sind.

Die KI darf nur aggregierte Analytics-Daten erhalten, nicht ungefiltert sämtliche personenbezogenen Antworten.

---

# 19. CSV-Export

Der Nutzer kann Antworten als CSV exportieren.

Optionen:

- alle Antworten
- ausgewählter Zeitraum
- nur abgeschlossene Antworten
- bestimmte Formularversion
- bestimmte Felder

Wichtige technische Details:

- UTF-8
- saubere Behandlung von Zeilenumbrüchen
- korrekte Escapes
- dynamische Spalten
- lesbare Auswahlwerte
- Schutz vor CSV-Formula-Injection

Werte, die mit `=`, `+`, `-` oder `@` beginnen, müssen beim Export neutralisiert werden, damit Tabellenprogramme sie nicht als Formeln ausführen.

---

# 20. Authentifizierung und Workspaces

Die Anwendung sollte mandantenfähig aufgebaut werden.

## Benutzer

- Registrierung
- Anmeldung
- Passwort zurücksetzen
- Profil bearbeiten

## Workspaces

Ein Nutzer kann mindestens einen Workspace besitzen.

Ein Workspace enthält:

- Mitglieder
- Formulare
- Antworten
- Themes
- Nutzungslimits

## Rollen

Mindestens:

- Owner
- Editor
- Viewer

### Owner

Kann alles verwalten und Mitglieder einladen.

### Editor

Kann Formulare erstellen, bearbeiten und veröffentlichen.

### Viewer

Kann Antworten und Analytics ansehen, aber keine Formulare verändern.

Supabase Auth kann JWT-basierte Authentifizierung mit PostgreSQL Row Level Security verbinden. Für alle exponierten Tabellen sollte RLS aktiviert werden. Supabase weist ausdrücklich darauf hin, dass Service-Keys RLS umgehen können und niemals im Browser landen dürfen.

---

# 21. Datenmodell

Empfohlene Tabellen:

## `profiles`

- `id`
- `display_name`
- `avatar_url`
- `created_at`

## `workspaces`

- `id`
- `name`
- `slug`
- `owner_id`
- `created_at`

## `workspace_members`

- `workspace_id`
- `user_id`
- `role`
- `created_at`

## `forms`

- `id`
- `workspace_id`
- `title`
- `slug`
- `status`
- `draft_revision`
- `published_version_id`
- `created_by`
- `created_at`
- `updated_at`

## `form_versions`

- `id`
- `form_id`
- `version_number`
- `schema_version`
- `definition`
- `is_published`
- `created_by`
- `created_at`

`definition` kann als PostgreSQL `jsonb` gespeichert werden.

## `form_sessions`

- `id`
- `form_id`
- `form_version_id`
- `status`
- `started_at`
- `completed_at`
- `last_step_id`
- `duration_ms`
- `metadata`

## `responses`

- `id`
- `session_id`
- `form_id`
- `form_version_id`
- `status`
- `submitted_at`

## `response_answers`

- `id`
- `response_id`
- `field_id`
- `field_type`
- `value`
- `created_at`

`value` kann ebenfalls als `jsonb` gespeichert werden, damit Text-, Auswahl- und Dateianworten einheitlich abgebildet werden können.

## `form_events`

- `id`
- `form_id`
- `form_version_id`
- `session_id`
- `event_type`
- `page_id`
- `field_id`
- `metadata`
- `created_at`

## `ai_generations`

- `id`
- `workspace_id`
- `user_id`
- `form_id`
- `operation`
- `prompt_version`
- `model`
- `input_tokens`
- `output_tokens`
- `latency_ms`
- `status`
- `created_at`

## `assets`

- `id`
- `workspace_id`
- `storage_path`
- `filename`
- `mime_type`
- `size`
- `created_by`
- `created_at`

---

# 22. API-Struktur

Empfohlene Endpunkte:

## KI

```text
POST /api/ai/forms/generate
POST /api/ai/forms/rewrite-field
POST /api/ai/forms/generate-options
POST /api/ai/forms/suggest-logic
POST /api/ai/forms/translate
```

## Formularverwaltung

```text
GET    /api/forms
POST   /api/forms
GET    /api/forms/:id
PATCH  /api/forms/:id
DELETE /api/forms/:id
POST   /api/forms/:id/duplicate
POST   /api/forms/:id/publish
POST   /api/forms/:id/unpublish
```

## Öffentliche Formulare

```text
GET  /api/public/forms/:slug
POST /api/public/forms/:slug/sessions
POST /api/public/forms/:slug/events
POST /api/public/forms/:slug/submissions
```

## Antworten und Analytics

```text
GET /api/forms/:id/responses
GET /api/forms/:id/responses/:responseId
GET /api/forms/:id/analytics
GET /api/forms/:id/export
```

Next.js Route Handlers im App Router eignen sich für diese serverseitigen Endpunkte. Sie werden über `route.ts` innerhalb des `app`-Verzeichnisses definiert und verwenden die Web-Standards `Request` und `Response`.

---

# 23. Frontend-Architektur

Empfohlener Stack:

```text
Next.js App Router
TypeScript
React
Tailwind CSS
Supabase
Claude Haiku 4.5
@anthropic-ai/sdk
dnd-kit
React Hook Form
Zod
TanStack Query
Zustand oder reducerbasierter Builder Store
```

## Verantwortlichkeiten

### React Hook Form

Für:

- öffentliches Formular
- Validierung
- Feldzustände
- Submit-Verarbeitung

Nicht als alleinige State-Lösung für den kompletten Builder.

### Builder Store

Für:

- aktuelle Formulardefinition
- ausgewähltes Feld
- Drag-and-drop
- Undo und Redo
- Seitenverwaltung
- Theme-Einstellungen
- ungespeicherte Änderungen

### TanStack Query

Für:

- Formulare laden
- Antworten laden
- Analytics laden
- Mutation-Status
- Cache Invalidierung
- Optimistic Updates

### Zod

Für:

- Formulardefinition
- KI-Ausgabe
- API-Payloads
- Feldvalidierung
- Versionsmigrationen

---

# 24. Empfohlene Projektstruktur

```text
app/
├── (auth)/
├── (dashboard)/
│   ├── forms/
│   ├── responses/
│   └── settings/
├── f/[slug]/
├── embed/[slug]/
└── api/
    ├── ai/
    ├── forms/
    └── public/

features/
├── form-builder/
├── form-renderer/
├── form-analytics/
├── form-responses/
├── form-themes/
└── ai-generation/

lib/
├── anthropic/
├── supabase/
├── form-schema/
├── logic-engine/
├── validation/
├── analytics/
└── security/

components/
├── ui/
└── shared/

supabase/
├── migrations/
└── seed/
```

Builder und Renderer sollten getrennte Features sein, aber auf dasselbe Schema und dieselbe Logic Engine zugreifen.

---

# 25. Sicherheit

## Serverseitige Secrets

Folgende Werte dürfen niemals im Client-Bundle landen:

- Anthropic API-Key
- Supabase Service Role Key
- interne Signaturschlüssel

## Öffentliche Übermittlungen

Schutzmaßnahmen:

- Rate Limiting
- Honeypot-Feld
- optionales Captcha
- maximale Payload-Größe
- Eingabelängen begrenzen
- serverseitige Validierung
- Idempotency Key
- Erkennung doppelter Übermittlungen

## Datei-Uploads

- Dateitypen serverseitig prüfen
- Dateigröße begrenzen
- zufällige Storage-Pfade verwenden
- keine Originaldateinamen als Pfad nutzen
- private Storage Buckets
- zeitlich begrenzte Download-URLs
- ausführbare Dateien ablehnen

## Nutzergenerierte Inhalte

Beschreibungen und Labels dürfen nicht ungeprüft als HTML ausgegeben werden.

Entweder:

- ausschließlich Plaintext,
- oder streng sanitisiertes Rich Text.

---

# 26. Performance

Der öffentliche Formularrenderer sollte möglichst wenig Builder-Code laden.

Deshalb:

- Builder und Public Renderer getrennt bündeln
- veröffentlichte Formdefinition cachen
- Analytics-Events asynchron senden
- Bilder optimieren
- Fonts begrenzen
- Formulare nicht bei jedem Tastendruck serverseitig speichern
- große Analytics-Auswertungen serverseitig aggregieren

Die öffentliche Formseite darf weder `dnd-kit` noch Builder-Komponenten laden.

---

# 27. Testing

## Unit Tests

Besonders für:

- Logic Engine
- Validierungsregeln
- Schema-Migrationen
- Analytics-Berechnung
- CSV-Export
- Undo/Redo
- Builder-Kommandos

## Integration Tests

- Formular speichern
- Formular veröffentlichen
- Formular absenden
- Version korrekt zuordnen
- Antwort exportieren
- RLS-Zugriffe

## End-to-End Tests

Mit Playwright:

1. Nutzer meldet sich an.
2. Nutzer generiert Formular.
3. Nutzer verschiebt ein Feld.
4. Nutzer erstellt eine Bedingung.
5. Nutzer veröffentlicht das Formular.
6. Besucher füllt das Formular aus.
7. Antwort erscheint im Dashboard.
8. Analytics werden aktualisiert.

Claude-Antworten sollten in automatisierten Tests gemockt werden. Tests dürfen nicht von echten Modellantworten abhängen.

## Accessibility Tests

- Tastaturnavigation
- Fokus-Reihenfolge
- sichtbare Fokuszustände
- Labels für Eingabefelder
- Fehleransagen
- Farbkontraste
- Screenreader-Ausgabe

---

# 28. Bewusste Abgrenzung der ersten Version

Die erste portfoliofähige Version benötigt nicht:

- Zahlungsabwicklung
- eigene Domains
- Marketplace für Templates
- gleichzeitige Live-Bearbeitung
- komplexe CRM-Integrationen
- Zapier-App
- Salesforce-Integration
- E-Mail-Kampagnen
- vollständige White-Label-Plattform
- frei programmierbare Webhooks
- KI-Agenten, die selbstständig Aktionen ausführen

Diese Funktionen würden den Umfang stark vergrößern, ohne den Kern des Projekts deutlich stärker zu machen.

---

# 29. Was die erste vollständige Version zwingend können muss

## Unverzichtbar

- Authentifizierung
- mandantenfähige Workspaces
- Formular-Dashboard
- Erstellung per Claude Haiku
- manuelle Formularerstellung
- Drag-and-drop Builder
- mindestens zwölf Feldtypen
- mehrstufige Formulare
- Validierungen
- Conditional Logic
- Theme Editor
- responsive Vorschau
- Autosave
- Undo und Redo
- Entwurfs- und Veröffentlichungsstatus
- versionierte Veröffentlichung
- öffentliche Formular-URL
- iframe-Embed
- Antwortverwaltung
- Basis-Analytics
- CSV-Export
- RLS und serverseitige Validierung
- automatisierte Tests

## Sehr sinnvoll für den Senior-Eindruck

- konfliktfreies Speichern mit Revisionen
- zentrale Logic Engine
- unveränderliche veröffentlichte Versionen
- KI-Ausgaben über JSON-Schema
- Prompt-Versionierung
- Token- und Kostenprotokollierung
- Analytics-Funnel
- Formula-Injection-Schutz beim CSV-Export
- barrierefreie Drag-and-drop-Interaktionen
- idempotente Formularübermittlung
- Schema-Versionierung und Migrationen

---

# 30. Definition of Done

Die Anwendung gilt als portfoliofähig fertig, wenn folgender Ablauf vollständig funktioniert:

1. Ein neuer Nutzer erstellt einen Account.
2. Er beschreibt ein gewünschtes Formular.
3. Claude Haiku erzeugt ein korrektes mehrstufiges Formular.
4. Das Formular erscheint unmittelbar im Builder.
5. Der Nutzer verändert Fragen und Reihenfolge.
6. Er fügt eine bedingte Weiterleitung hinzu.
7. Er passt das Theme an.
8. Er testet das Formular auf Mobil- und Desktopansicht.
9. Er veröffentlicht eine feste Version.
10. Ein externer Besucher öffnet den öffentlichen Link.
11. Der Besucher durchläuft den korrekten Antwortpfad.
12. Die Antwort wird sicher gespeichert.
13. Der Ersteller sieht die Antwort im Dashboard.
14. Analytics zeigen Aufruf, Start und Abschluss.
15. Die Antwort kann als CSV exportiert werden.
16. Spätere Änderungen am Entwurf verändern die veröffentlichte Version erst nach einer erneuten Veröffentlichung.

Damit ist es nicht nur eine KI-Demo, sondern eine vollständige, produktähnliche SaaS-Anwendung.

## 23. Verbindlicher UI- und Style-Guide

Neben der technischen Architektur sollst du einen konkreten visuellen Style-Guide für die Anwendung planen. Dieser Style-Guide ist für die spätere Umsetzung verbindlich und muss sich durch Dashboard, Builder, öffentliche Formulare, Analytics und Einstellungsseiten konsistent fortsetzen.

Die Anwendung verwendet grundsätzlich ein helles Erscheinungsbild mit Teal als primärer Markenfarbe.

Der visuelle Eindruck soll sein:

- modern
- ruhig
- hochwertig
- technisch präzise
- klar strukturiert
- professionell
- leicht zugänglich
- nicht verspielt
- nicht übermäßig futuristisch
- nicht wie ein generisches KI-SaaS-Template

Die Oberfläche soll eher wie ein ausgereiftes B2B-SaaS-Produkt wirken als wie eine Marketing-Landingpage.

### 23.1 Gestaltungsprinzipien

Halte dich bei allen UI-Entscheidungen an folgende Prinzipien:

#### Klarheit vor Dekoration

Jede visuelle Entscheidung muss einen funktionalen Zweck erfüllen.

Vermeide:

- unnötige Farbverläufe
- übermäßige Schatten
- dekorative Glows
- stark abgerundete Karten
- Glas-Effekte
- übertriebene Animationen
- zufällige Farbflächen
- überladene Dashboards
- künstlich wirkende KI-Illustrationen

#### Hierarchie durch Typografie und Abstände

Die visuelle Hierarchie soll hauptsächlich entstehen durch:

- Schriftgröße
- Schriftgewicht
- Kontrast
- Abstände
- Gruppierung
- Linien
- dezente Flächen

Nicht jede Sektion benötigt eine eigene Karte oder einen eigenen farbigen Hintergrund.

#### Hohe Informationsdichte ohne Enge

Die Anwendung soll für produktives Arbeiten optimiert sein.

Insbesondere im Builder und in der Antwortverwaltung müssen viele Informationen sichtbar sein, ohne dass die Oberfläche überladen wirkt.

Nutze:

- kompakte Toolbars
- klar getrennte Panels
- konsistente Abstände
- eindeutige Auswahlzustände
- verständliche Icons mit Tooltips
- gut lesbare Tabellen
- zurückhaltende Sekundärinformationen

#### Konsistenz

Interaktive Elemente müssen in allen Bereichen gleich funktionieren und aussehen.

Dies betrifft insbesondere:

- Buttons
- Eingabefelder
- Dropdowns
- Dialoge
- Tabs
- Tabellen
- Seitenleisten
- Tooltips
- Toasts
- Statusanzeigen
- Empty States
- Ladezustände
- Fehlermeldungen

---

### 23.2 Farbkonzept

Verwende ein Light Theme als Standard.

#### Primärfarbe

Die primäre Markenfarbe ist Teal.

Empfohlene Ausgangspalette:

```text
Teal 50:  #F0FDFA
Teal 100: #CCFBF1
Teal 200: #99F6E4
Teal 300: #5EEAD4
Teal 400: #2DD4BF
Teal 500: #14B8A6
Teal 600: #0D9488
Teal 700: #0F766E
Teal 800: #115E59
Teal 900: #134E4A
Teal 950: #042F2E
```

Teal soll gezielt eingesetzt werden für:

- primäre Buttons
- aktive Navigation
- Fokuszustände
- ausgewählte Elemente
- Fortschrittsanzeigen
- Links
- positive Hervorhebungen
- aktive Builder-Zustände

Teal darf nicht großflächig als Hintergrund für ganze Seiten verwendet werden.

#### Neutrale Farben

Die Anwendung benötigt eine warme oder leicht kühle neutrale Graupalette.

Empfohlene Richtung:

```text
Background:        #F8FAFC
Surface:           #FFFFFF
Surface Subtle:    #F1F5F9
Border:            #E2E8F0
Border Strong:     #CBD5E1
Text Primary:      #0F172A
Text Secondary:    #475569
Text Muted:        #64748B
Text Disabled:     #94A3B8
```

Der Hauptseitenhintergrund soll leicht vom Weiß der Inhalte abgesetzt sein.

Weiße Flächen werden gezielt verwendet für:

- Builder-Panels
- Tabellen
- Dialoge
- Formularkarten
- Eigenschaftsbereiche
- öffentliche Formularcontainer

#### Semantische Farben

Definiere außerdem konsistente semantische Farben für:

- Erfolg
- Warnung
- Fehler
- Information
- Entwurf
- veröffentlicht
- pausiert
- archiviert

Semantische Farben dürfen nicht nur über Farbe kommunizieren. Ergänze immer:

- Text
- Symbol
- Label
- oder Status-Badge

#### Kontrast

Alle Farbkombinationen müssen mindestens WCAG-AA-Kontrast erfüllen.

Besonders prüfen:

- Teal-Text auf hellem Hintergrund
- weiße Schrift auf Teal-Buttons
- deaktivierte Zustände
- Fehlermeldungen
- Platzhaltertexte
- Tabelleninformationen
- Status-Badges

Teal 500 soll nicht automatisch für jeden Text auf weißem Hintergrund verwendet werden. Für kleine Texte und Links kann eine dunklere Teal-Abstufung erforderlich sein.

---

### 23.3 Design Tokens

Plane die Oberfläche tokenbasiert.

Die Anwendung soll keine unkoordinierten Einzelwerte in Komponenten verwenden.

Definiere mindestens Tokens für:

```text
color.background
color.surface
color.surfaceSubtle
color.border
color.borderStrong
color.textPrimary
color.textSecondary
color.textMuted
color.primary
color.primaryHover
color.primaryActive
color.primarySubtle
color.success
color.warning
color.error
color.info

radius.small
radius.medium
radius.large

shadow.small
shadow.medium
shadow.overlay

spacing.1
spacing.2
spacing.3
spacing.4
spacing.5
spacing.6
spacing.8
spacing.10
spacing.12

font.size.xs
font.size.sm
font.size.base
font.size.lg
font.size.xl
font.size.2xl

layout.sidebarWidth
layout.propertiesPanelWidth
layout.contentMaxWidth
layout.headerHeight
```

Beschreibe, wie diese Tokens mit Tailwind CSS umgesetzt werden sollen.

Bevorzuge:

- CSS Custom Properties für semantische Tokens
- Tailwind für Utility-Klassen
- zentrale Token-Definitionen
- keine verstreuten Hexwerte in Komponenten

Beispielhafte Struktur:

```css
:root {
  --background: 248 250 252;
  --surface: 255 255 255;
  --foreground: 15 23 42;

  --primary: 13 148 136;
  --primary-hover: 15 118 110;
  --primary-subtle: 240 253 250;

  --border: 226 232 240;
  --muted: 100 116 139;
}
```

Die genaue technische Umsetzung soll mit der verwendeten Tailwind-Version kompatibel sein.

---

### 23.4 Typografie

Verwende eine moderne, gut lesbare Sans-Serif-Schrift.

Bevorzugte Richtung:

- Inter
- Geist Sans
- oder eine vergleichbare hochwertige UI-Schrift

Verwende nicht mehrere dekorative Schriftfamilien.

Empfohlene Hierarchie:

```text
Page Title:
28–32 px, Semibold

Section Title:
20–24 px, Semibold

Card Title:
15–17 px, Semibold

Body:
14–16 px, Regular

UI Label:
13–14 px, Medium

Helper Text:
12–13 px, Regular

Table Metadata:
12–13 px, Regular
```

Verwende keine übermäßig großen Überschriften innerhalb der Anwendung.

Die Benutzeroberfläche ist ein Arbeitswerkzeug und keine Landingpage.

Achte auf:

- ausreichende Zeilenhöhe
- klare Gewichtsunterschiede
- begrenzte Zeilenlänge bei Fließtext
- konsistente Groß- und Kleinschreibung
- keine vollständigen Überschriften in Großbuchstaben

---

### 23.5 Abstände und Layout

Nutze ein konsistentes Spacing-System auf Basis von vier Pixeln.

Beispiel:

```text
4 px
8 px
12 px
16 px
20 px
24 px
32 px
40 px
48 px
```

#### Dashboard

Das Dashboard verwendet:

- eine kompakte Hauptnavigation
- einen klaren Seitenkopf
- einen zentralen Inhaltsbereich
- ausreichend horizontalen Raum
- zurückhaltende Karten
- responsive Tabellen oder Listen

#### Builder

Der Builder verwendet auf Desktop ein dreigeteiltes Layout:

```text
Linkes Panel:
Feldbibliothek und Seitenstruktur

Mittlerer Bereich:
Formular-Canvas

Rechtes Panel:
Eigenschaften des ausgewählten Elements
```

Empfohlene Größenordnung:

```text
Linkes Panel: 240–280 px
Rechtes Panel: 300–360 px
Canvas: verbleibende Breite
```

Die Seitenpanels sollen visuell durch feine Rahmen getrennt sein, nicht durch starke Schatten.

Der Canvas-Bereich darf einen leicht abgesetzten Hintergrund erhalten, damit das eigentliche Formular als weiße Fläche erkennbar bleibt.

#### Öffentliche Formulare

Öffentliche Formulare sollen stärker fokussiert und ruhiger wirken als der Builder.

Empfohlene Struktur:

- neutraler Seitenhintergrund
- zentrierter Formularcontainer
- klare Frage
- ausreichend Weißraum
- gut sichtbare Eingabefelder
- eindeutige Primäraktion
- dezente Fortschrittsanzeige

Die Formulare dürfen individuell über den Theme Editor angepasst werden, müssen aber auf einem zugänglichen und hochwertigen Basissystem aufbauen.

---

### 23.6 Radien und Schatten

Verwende moderate Radien.

Empfohlene Richtung:

```text
Kleine Elemente:
6 px

Inputs und Buttons:
8 px

Karten und Dialoge:
10–12 px

Große Modals:
12–16 px
```

Vermeide pillenförmige Buttons als Standard.

Pill-Formen können verwendet werden für:

- kleine Status-Badges
- Filter-Chips
- Tags

Schatten sollen dezent bleiben.

Nutze Schatten primär für:

- Dropdowns
- Popovers
- Dialoge
- schwebende Drag-Elemente
- fokussierte Overlays

Normale Karten benötigen meist nur:

- einen feinen Rahmen
- einen sehr dezenten Schatten
- oder gar keinen Schatten

---

### 23.7 Buttons

Definiere mindestens folgende Button-Varianten:

#### Primary

Für die wichtigste Aktion einer Ansicht.

Beispiele:

- Formular erstellen
- veröffentlichen
- speichern
- Formular absenden

Design:

- Teal-Hintergrund
- weiße Schrift
- klarer Hover-Zustand
- sichtbarer Fokus-Ring
- nicht zu stark abgerundet

#### Secondary

Für wichtige, aber nachgeordnete Aktionen.

Design:

- weißer oder neutraler Hintergrund
- dunkler Text
- sichtbarer Rahmen

#### Ghost

Für Toolbars und sekundäre Aktionen.

Design:

- transparenter Hintergrund
- dezenter Hover-Zustand

#### Destructive

Für irreversible oder gefährliche Aktionen.

Beispiele:

- löschen
- Workspace entfernen
- Submission endgültig löschen

Destruktive Aktionen dürfen nicht in Teal dargestellt werden.

#### Icon Button

Icon Buttons müssen besitzen:

- mindestens 36 × 36 Pixel Interaktionsfläche
- sichtbaren Hover-Zustand
- Fokuszustand
- Tooltip
- zugänglichen Namen

---

### 23.8 Formularelemente

Eingabefelder sollen ruhig, klar und funktional gestaltet sein.

Standardzustand:

- weißer Hintergrund
- neutraler Rahmen
- dunkler Text
- dezenter Placeholder
- Radius von etwa acht Pixeln

Fokuszustand:

- Teal-Rahmen oder Teal-Fokus-Ring
- keine Layoutverschiebung
- klar visuell erkennbar

Fehlerzustand:

- semantische Fehlerfarbe
- verständliche Fehlermeldung
- Icon nur ergänzend
- keine Kommunikation ausschließlich über rote Farbe

Disabled-Zustand:

- klar als deaktiviert erkennbar
- trotzdem lesbar
- Cursor und Interaktion entsprechend angepasst

Unterstütze konsistent:

- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Combobox
- Date Picker
- File Upload
- Slider
- Rating
- Search Field

---

### 23.9 Karten und Container

Nicht jeder Bereich soll als Karte dargestellt werden.

Verwende Karten nur, wenn Inhalte tatsächlich als eigenständige Einheit gruppiert werden müssen.

Eine Standardkarte besitzt:

- weißen Hintergrund
- feinen Rahmen
- moderaten Radius
- klaren internen Abstand
- optional einen sehr dezenten Schatten

Vermeide:

- Karten innerhalb von Karten innerhalb von Karten
- stark unterschiedliche Radien
- zufällige Hintergrundfarben
- unnötige Card-Grids

---

### 23.10 Tabellen

Antworten, Formulare und Mitglieder sollen in professionellen Datentabellen dargestellt werden.

Tabellen benötigen:

- klare Spaltenüberschriften
- dezente horizontale Trennung
- Hover-Zustand
- Tastaturzugänglichkeit
- Sortierung
- Filter
- Suche
- Pagination
- Empty State
- Ladezustand
- Auswahlzustand

Vermeide starke vertikale Linien.

Metadaten dürfen visuell zurückhaltend sein, müssen aber lesbar bleiben.

Auf kleinen Bildschirmen soll entschieden werden, ob:

- horizontales Scrollen,
- reduzierte Spalten,
- oder eine alternative Listenansicht

sinnvoller ist.

---

### 23.11 Navigation

Die Hauptnavigation soll kompakt und klar sein.

Mögliche Bereiche:

- Dashboard
- Formulare
- Antworten
- Analytics
- Templates
- Workspace
- Einstellungen

Aktive Navigation:

- dezenter Teal-Hintergrund
- dunkler Teal-Text
- optional ein Icon
- keine großflächige Vollfarbe

Die Navigation muss auch bei vielen Formularen und Workspaces übersichtlich bleiben.

---

### 23.12 Builder-spezifische Zustände

Der Builder benötigt besonders eindeutige Interaktionszustände.

#### Ausgewähltes Feld

Ein ausgewähltes Feld erhält:

- Teal-Rahmen
- dezenten Teal-Hintergrund oder Fokusindikator
- sichtbare Schnellaktionen
- klare Verbindung zum Eigenschaftenpanel

#### Hover-Zustand

Beim Hover:

- dezenter Rahmen
- Cursor-Feedback
- optionale Drag-Hilfe

#### Drag-Zustand

Während des Verschiebens:

- klar erkennbare Drop-Zone
- sichtbarer Einfügeindikator
- leicht angehobenes Drag-Element
- kein übertriebener Schatten
- kein Springen des Layouts

#### Ungültiger Zustand

Ungültige Felder oder Regeln erhalten:

- verständliche Warnung
- Fehler-Badge
- direkten Link oder Fokus zur fehlerhaften Einstellung

#### Nicht sichtbare Conditional-Fields

Felder, die nur unter bestimmten Bedingungen sichtbar sind, sollen im Builder weiterhin bearbeitbar sein.

Kennzeichne sie beispielsweise mit:

- Logic-Icon
- kleinem Badge
- Tooltip mit Bedingungszusammenfassung

---

### 23.13 Feedback und Systemzustände

Jede asynchrone Aktion benötigt sichtbares Feedback.

Berücksichtige:

- Speichert …
- Gespeichert
- Änderungen konnten nicht gespeichert werden
- Veröffentlichung läuft
- Formular wurde veröffentlicht
- KI generiert Vorschlag
- KI-Anfrage ist fehlgeschlagen
- Upload läuft
- Export wird erstellt

Verwende je nach Situation:

- Inline-Status
- Toast
- Progress Indicator
- Skeleton
- Error Banner

Toasts dürfen nicht für kritische Fehler verwendet werden, die eine direkte Nutzeraktion erfordern.

---

### 23.14 Empty States

Empty States sollen hilfreich und konkret sein.

Beispiele:

#### Keine Formulare

- kurze Erklärung
- primäre Aktion „Erstes Formular erstellen“
- optional Zugriff auf Templates

#### Keine Antworten

- erklären, dass noch keine Submission eingegangen ist
- öffentlichen Link anbieten
- Testmodus anbieten

#### Keine Analytics-Daten

- darauf hinweisen, dass Analytics nach ersten Aufrufen erscheinen
- keine künstlichen Demo-Daten anzeigen

Empty States dürfen nicht aus generischen Illustrationen und Marketingtexten bestehen.

---

### 23.15 Dialoge und Overlays

Modals sollen nur für fokussierte Aufgaben verwendet werden.

Beispiele:

- Formular löschen
- Veröffentlichung bestätigen
- Mitglied einladen
- Vorlage auswählen
- KI-Vorschlag vergleichen

Längere Bearbeitungsprozesse sollen nicht unnötig in kleinen Modals stattfinden.

Dialoge benötigen:

- eindeutigen Titel
- kurze Beschreibung
- klare Primäraktion
- klare Abbruchmöglichkeit
- Focus Trap
- Escape-Unterstützung
- Wiederherstellung des vorherigen Fokus

---

### 23.16 Animationen

Animationen sollen funktional und zurückhaltend sein.

Erlaubte Einsatzzwecke:

- Öffnen von Dropdowns
- Panel-Wechsel
- Einfügen und Verschieben von Feldern
- Fortschrittsänderungen
- Toasts
- Statuswechsel
- Skeleton zu Inhalt

Empfohlene Dauer:

```text
Schnelle Interaktion:
100–150 ms

Normale UI-Transition:
150–220 ms

Dialog oder Panel:
200–280 ms
```

Vermeide:

- lange Einblendungen
- springende Karten
- Parallax
- ständig pulsierende KI-Elemente
- auffällige Hintergrundanimationen

Unterstütze `prefers-reduced-motion`.

---

### 23.17 Icons

Verwende eine einheitliche Icon-Bibliothek, beispielsweise Lucide.

Icons sollen:

- konsistente Strichstärken besitzen
- nicht mit unterschiedlichen Bibliotheken vermischt werden
- immer einen funktionalen Zweck erfüllen
- bei unklarer Bedeutung mit Text oder Tooltip ergänzt werden

Icons ersetzen keine verständlichen Labels bei wichtigen Aktionen.

---

### 23.18 Responsives Verhalten

Das Dashboard und öffentliche Formulare müssen vollständig responsiv sein.

Der Builder ist primär für Desktop und größere Tablets optimiert.

Für kleinere Bildschirme soll der Builder entweder:

- einen eingeschränkten Bearbeitungsmodus,
- eine reine Vorschau,
- oder eine klare Meldung zur empfohlenen Desktop-Nutzung

anbieten.

Versuche nicht, das vollständige dreigeteilte Builder-Layout unverändert auf ein Smartphone zu pressen.

Öffentliche Formulare müssen dagegen auf Smartphones vollständig nutzbar sein.

Achte auf:

- ausreichend große Touch-Ziele
- keine horizontalen Überläufe
- mobile Tastaturen
- sichere Abstände
- Scroll-Verhalten
- Fokus bei Validierungsfehlern

---

### 23.19 Accessibility

Barrierefreiheit ist Bestandteil des Designs und keine spätere Ergänzung.

Berücksichtige:

- semantisches HTML
- Tastaturnavigation
- sichtbare Fokuszustände
- sinnvolle Tab-Reihenfolge
- Labels für alle Felder
- verständliche Fehlermeldungen
- Live Regions für dynamische Statusänderungen
- Screenreader-Texte für Icon Buttons
- Kontrast
- Reduced Motion
- Drag-and-drop-Alternative über Tastatur

Der Style-Guide darf niemals visuelle Minimalistik über Bedienbarkeit stellen.

---

### 23.20 KI-spezifische UI

Die KI-Funktionen sollen visuell integriert wirken und nicht wie ein separates Gimmick.

Vermeide:

- magische Glows
- lila Farbverläufe
- animierte Sterne
- futuristische KI-Hintergründe
- übertriebene „Magic“-Darstellung

KI-Aktionen können gekennzeichnet werden durch:

- dezentes Sparkles-Icon
- Teal-Subtle-Hintergrund
- klares Label
- beschreibenden Text

Beispiele:

- Mit KI erstellen
- Frage verbessern
- Optionen vorschlagen
- Logik vorschlagen
- Analytics zusammenfassen

Jeder KI-Vorschlag benötigt:

- sichtbaren Ladezustand
- klare Herkunft
- Vergleich mit vorhandenem Inhalt
- Übernehmen
- Verwerfen
- Neu generieren

KI-generierte Inhalte dürfen niemals unbemerkt bestehende Nutzerdaten überschreiben.

---

### 23.21 Öffentlicher Formularstil

Der Standardstil öffentlicher Formulare soll hochwertig, neutral und vertrauenswürdig sein.

Standardkonfiguration:

```text
Hintergrund:
sehr helles Grau oder Off-White

Formularfläche:
weiß

Primärfarbe:
Teal 600

Primärfarbe Hover:
Teal 700

Text:
Slate 900

Sekundärtext:
Slate 600

Rahmen:
Slate 200

Input-Fokus:
Teal 600

Containerbreite:
etwa 640–720 px

Radius:
10–12 px
```

Die Fragen sollen im Mittelpunkt stehen.

Vermeide:

- unnötige Navigation
- Ablenkungen
- große Marketingbereiche
- überladene Header
- mehrere konkurrierende Buttons

---

### 23.22 Unterschied zwischen Produkt-UI und Formular-Themes

Trenne klar zwischen:

#### Produkt-UI

Das Dashboard, der Builder und die Verwaltung verwenden den festen Teal-Light-Style-Guide.

#### Formular-Themes

Ersteller dürfen öffentliche Formulare innerhalb definierter Grenzen anpassen.

Der Theme Editor kann verändern:

- Primärfarbe
- Hintergrund
- Textfarbe
- Schrift
- Radius
- Containerbreite
- Button-Stil
- Input-Stil
- Logo
- Hintergrundbild

Der Theme Editor darf die Bedienbarkeit nicht zerstören.

Plane daher:

- zugängliche Standardwerte
- Kontrastprüfung
- begrenzte Auswahlmöglichkeiten
- Fallback-Werte
- sichere Theme-Tokens
- keine willkürlichen Inline-Styles
- zunächst kein freies Custom CSS

---

### 23.23 Komponentenbibliothek

Plane eine kleine, konsistente interne Komponentenbibliothek.

Mindestens:

- Button
- Icon Button
- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Switch
- Badge
- Card
- Dialog
- Dropdown Menu
- Tabs
- Tooltip
- Toast
- Alert
- Table
- Empty State
- Skeleton
- Spinner
- Breadcrumb
- Page Header
- Sidebar Item
- Form Field Wrapper

Beschreibe:

- welche Komponenten auf einer bestehenden zugänglichen Primitive-Bibliothek aufbauen sollten,
- welche Komponenten projektspezifisch entwickelt werden,
- wie Varianten typisiert werden,
- wie Design Tokens integriert werden,
- wie Accessibility getestet wird.

Eine Bibliothek wie Radix UI oder shadcn/ui darf als technische Grundlage verwendet werden. Die Anwendung soll jedoch nicht unverändert wie eine Standardinstallation dieser Bibliothek aussehen.

Passe insbesondere an:

- Typografie
- Radien
- Abstände
- Farben
- Schatten
- Tabellen
- Navigation
- Builder-Komponenten

---

### 23.24 Konkrete visuelle Deliverables im Plan

Der technische Masterplan soll zusätzlich folgende visuelle Deliverables enthalten:

1. vollständige Farbpalette mit semantischer Verwendung,
2. Typografie-Skala,
3. Spacing-System,
4. Radius-System,
5. Schatten-System,
6. Button-Varianten,
7. Formularzustände,
8. Status-Badges,
9. Layoutregeln für Dashboard und Builder,
10. responsive Breakpoints,
11. Accessibility-Regeln,
12. Liste der grundlegenden UI-Komponenten,
13. Beispiel für die visuelle Hierarchie einer Dashboard-Seite,
14. Beispiel für die visuelle Hierarchie des Builders,
15. Beispiel für den Standardstil eines öffentlichen Formulars.

Erstelle dabei noch keine vollständigen React-Komponenten.

Token-Beispiele, Klassenkonzepte und kleine strukturelle UI-Skizzen sind erlaubt.

---

### 23.25 Visuelle Qualitätskriterien

Die spätere Oberfläche gilt nur dann als erfolgreich, wenn:

- sie klar als zusammenhängendes Produkt erkennbar ist,
- Teal gezielt und nicht inflationär eingesetzt wird,
- das Light Theme angenehm und nicht steril wirkt,
- Tabellen und komplexe Builder-Bereiche übersichtlich bleiben,
- alle Interaktionszustände eindeutig sind,
- öffentliche Formulare auf Mobilgeräten hervorragend funktionieren,
- die UI nicht nach einem unveränderten Komponenten-Template aussieht,
- KI-Funktionen zurückhaltend und glaubwürdig integriert sind,
- die Anwendung WCAG-AA-Grundanforderungen erfüllt,
- die Gestaltung das technische Niveau des Projekts unterstützt.

Beziehe diesen Style-Guide in alle Architektur-, Komponenten- und Umsetzungsentscheidungen des Masterplans ein.
