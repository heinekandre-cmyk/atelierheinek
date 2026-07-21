# Atelier Heinek — Übergabe

**Stand:** 21. Juli 2026 · Werkbank v8 · Identität „Galerie & Sandkammer" (Landing dunkel) / „Die helle Galerie" (Konfigurator hell)

Diese Datei ist der Einstiegspunkt für jeden, der an `atelierheinek.com` weiterarbeitet — Andre selbst nach einer Pause, ein anderer Claude, oder eine Entwicklerin. Sie beschreibt, was existiert, warum es so aussieht, wo die offenen Enden liegen und wie man sicher testet, ohne die Live-Seite zu berühren.

---

## 1. Was das ist

Atelier Heinek ist eine Schmuckmarke aus Dornbirn, Vorarlberg: handgegossene 925er-Silberringe im Delft-Sand-Verfahren. Tagline: **„Aus dem Sand. In die Hand."**

Die Website hat zwei Teile:
- **Landing** (`src/index.html`) — dunkle Eintrittsseite, Sandkammer-Ästhetik, führt zur Werkbank.
- **Die Werkbank** (`src/werkbank/index.html`) — der Ringkonfigurator. Das Herzstück, an dem in dieser Session fast ausschließlich gearbeitet wurde.

Werkstatt ist **noch nicht gewerblich angemeldet** — die Seite sammelt unverbindliches Interesse per E-Mail, nimmt keine Bestellungen an. Das steht als Hinweistext im Übergabe-Kapitel der Werkbank (Suchwort im Code: `Gewerbeanmeldung`) und muss **entfernt werden, sobald die Gewerbeanmeldung durch ist**.

---

## 2. Architektur

```
atelierheinek/
├── build.mjs              Minifiziert HTML/CSS/JS, erzeugt CSP-Hashes → dist/
├── package.json
├── src/
│   ├── index.html          Landing (dunkel, Sandkammer)
│   ├── werkbank/index.html Konfigurator — DAS Kernstück, ~1500 Zeilen
│   ├── agb.html, datenschutz.html, faq.html, impressum.html
│   ├── vendor/
│   │   ├── fonts/           Playfair Display, Source Serif 4, JetBrains Mono,
│   │   │                    Singlong, Caveat, Archivo — alle self-hosted (DSGVO)
│   │   └── three/           Three.js r160, lokal (kein CDN)
│   ├── og-image.jpg, robots.txt, sitemap.xml
├── archiv/                 Frühere Werkbank-Generationen, siehe Abschnitt 6
└── dist/                   Build-Output, NICHT committen (.gitignore)
```

**Build:** `node build.mjs` → `dist/`. Cloudflare Pages baut das automatisch bei jedem Push.
**Keine Frameworks.** Vanilla JS, ES-Module, `<script type="importmap">` für Three.js. Kein npm-Bundler nötig für die Laufzeit — nur für den Build-Schritt (Minifizierung).

### Deployment
- Cloudflare Pages, „Import an existing Git repository", Repo `heinekandre-cmyk/atelierheinek` (privat).
- **Production branch der Live-Seite: `main`. Testarbeit läuft auf `test`.** Test-Branch niemals in main mergen ohne explizite Prüfung.
- Build command: `node build.mjs` · Output directory: `dist`.
- Test-URL: `https://<projektname>.pages.dev/werkbank/`.

---

## 3. Design-System

Zwei Welten, eine harte Kante dazwischen — kein Verlauf:

| | Landing | Werkbank |
|---|---|---|
| Grundton | dunkel (Sandkammer, Prozess) | hell (Galerie, Produkt) |
| Hintergrund | `#131211` Graphitnacht | `#F7F5F2`–`#FAFAF9` Steinweiß |
| Text | Creme `#ece2cc` | Tinte `#1C1917` |
| Akzent | Glut `#e0772b` (nur physische Hitze: Gusskanal, Abguss) | Gold `#A16207` (nur CTA & Preise) |

**Warum die Werkbank hell ist:** Silber liest sich auf warmem Hell deutlich besser als auf Dunkel — mehrere Belichtungsrunden mit echten Renders haben das bestätigt (Abschnitt 5).

**Typografie (beide Welten):**
- **Playfair Display** — Haltung, Überschriften, oft kursiv/versal
- **Source Serif 4** — Lesetext
- **JetBrains Mono** — die „Messstimme": alles Messbare (Maße, Größen, Preise, Sandform-Nr.) in Mono, oft mit Mittelpunkt-Trennern (`925/1000 · EU 54 · 8,2 g`)
- **Singlong** — Signatur/Wortmarke „AH"
- **Caveat** — handschriftliche Notizen in Profilbeschreibungen

**Feste Regeln, an die sich jede Änderung halten sollte:**
- Gold/Glut sind exklusiv reserviert (siehe Tabelle oben) — nie auf normalen UI-Elementen.
- Radius max. 2 px — Ring ist gegossenes Metall, kein Bubble-UI.
- Sandkorn (SVG-Textur) nur in der dunklen Welt.
- Bewegung: `cubic-bezier(0.23, 1, 0.32, 1)`, UI-Transitions ≤ 300 ms, `prefers-reduced-motion` wird überall respektiert.

---

## 4. Die Werkbank — sechs Stufen

Kein Assistent, kein mehrstufiger Formular-Flow. Die App ist **ein langes Scroll-Dokument**, die 3D-Bühne bleibt links/im Hintergrund fixiert, sechs Kapitel scrollen vorbei. Jedes Kapitel hat eine eigene Kamera-Choreografie und eine eigene **Pose** (Orientierung, Höhe, ganzer/halbierter Ring) — das Posen-System (`POSES`, `poseQuat`, `applyPoseGoal()`) blendet weich zwischen ihnen.

| # | Kapitel-ID | Was passiert |
|---|---|---|
| 1 | `#hero` | Ring liegt flach, hinten leicht erhoben |
| 2 | `#profil` | **Ring wird halbiert** (`makeCaps`, 180°-Sweep) — echte DXF-Querschnittsfläche sichtbar, inkl. Maßlinien-Sprites (Breite/Höhe in Mono) |
| 3 | `#mass` | Draufsicht, EU-Größe wird über ein Maßband gewählt |
| 4 | `#schiene` | Ring steht seitlich — Schienenbreite wählen |
| 5 | `#guss` | Makro-Zoom auf die Oberfläche (Hochglanz/Sandrau/Gestrahlt/Mattiert) |
| 6 | `#uebergabe` | Ring **dreht sich und fällt** (`tickDrop()`, 2,2 s Animation) in die Ruhelage, Anfrage-Formular |

**Der Auftragssatz** (`#satz`, sticky oben im Bogen) ist die Navigation: ein Fließtext-Satz mit klickbaren Mono-Werten, die zu ihrem Kapitel springen — statt eines Menüs.

### Kerngeometrie (nicht anfassen ohne Grund — hier steckt die eigentliche Wertschöpfung)
- `profilePoints()` / `dedupeContour()` — liest echte DXF-Profildaten (fünf Profile: First, Kuppel, Flach, Kastig, Block).
- `makeRingGeometries()` — Rotationskörper aus der Profilkontur, Innen-/Außen-Trennung über Flächennormale, nahtlose Normalen. Unterstützt Teilbögen (`arc`-Parameter) für den Halbring und Mikro-Displacement (`displace`-Parameter) für die Gusskante bei Sandguss-Finishes.
- `makeCaps()` — die gefrästen Schnittdeckel des Halbrings, Fächer-Triangulation vom Profilschwerpunkt.
- `makeSandMaps()` — mehrskaliges Value-Noise (drei Skalen + Poren) für Normal- **und** Roughness-Map. Kein simples Ein-Skalen-Rauschen mehr (das sah nach billigem 3D aus, siehe Abschnitt 5).
- Preislogik: `PRICING` (Basis 130 €, 4 €/g Material, Aufschläge für Politur/Vergoldung/Hammerschlag/Sepia), `estimatePrice()`, `silverGrams()`.

### Neu in v7 (dieser Session)
- **Geometrie-Cache/Debounce** (`scheduleRebuild()`, 90 ms) — schnelles Durchklicken der Größen/Profile löst nicht mehr pro Klick einen vollen Neuguss aus.
- **Bodenspiegelung** (`buildReflection()`, `mirrorPivot`) — dynamisch aus der Bounding-Box berechnet, funktioniert automatisch in allen sechs Posen ohne hartkodierte Koordinaten.
- **Maßlinien auf der Schnittfläche** (`buildCutLabels()`) — nur sichtbar wenn `poseHalf` aktiv ist.

### Neu in v8 (diese Session)
- **Sweep statt Sprung:** Der Halbring entsteht nicht mehr durch harten Geometrie-Tausch. `rebuildRing(arcOverride, light)` baut den Ring mit beliebigem Öffnungswinkel, `arcAnim`/`tickArc()` fahren den Bogen in 650 ms (Haus-Easing) von 2π nach π und zurück — **immer vom aktuellen `arcCurrent` aus**, egal wie schnell jemand zwischen Kapiteln springt. Schnittdeckel (`makeCaps`) wandern mit; Maßlinien und Gusskanten-Displacement kommen erst im finalen Guss.
- **Kein Lage-Reset mehr:** `rebuildRing()` übernimmt Quaternion und Höhe des Vorgängers (`keepQ`/`keepY`) statt auf die Ziel-Pose zu springen. Jeder Übergang entsteht aus der vorherigen Position.
- **Der Münzfall (Übergabe):** 5 Sekunden, physikalisch motiviert wie eine gedrehte Münze. `startDrop()` misst einmalig die Bodenhöhe der flachen Ruhelage (Bounding-Box), `tickDrop()` blendet in 0,6 s aus der aktuellen Lage ins Taumeln, dann Euler-Scheibe: Neigung θ = 90°·(1−t^2,4), Präzession ω = 3,0 + 4,2/√θ (wird schneller, je flacher der Ring), leises Abrollen um die eigene Achse. Die Höhe wird **nicht animiert, sondern pro Frame gemessen** — der Ring bleibt exakt in Bodenkontakt. Headless verifiziert: endet flach, exakt auf −4,27, keine NaN.
- **Werkstattzettel als PDF** (`btnPDF`, sichtbar für alle, dezent unter dem CTA): jsPDF lazy von `/vendor/jspdf.umd.min.js`, hochauflösender Live-Screenshot des Rings (`captureRingImage`, render-dann-sofort-auslesen), A4-Datenblatt in der Galerie-Palette (Gold nur beim Richtpreis). Fallback: `window.print()` — die Seite hat Print-Styles.
- **Werkstatt-Export** (`btnSTEP`/`btnSTL`/`btnOBJ`): nur sichtbar mit **`?werkstatt`** in der URL. STL binär, OBJ, und der analytische STEP-B-Rep aus v2 (unverändert portiert, in Node gegen alle Profile × EU 42/60/72 getestet — geschlossener Solid, keine NaN). Exportiert wird immer der **volle** Ring, unabhängig von Halbring/Sweep auf der Bühne. `flushRebuild()` bringt die Bühne vor dem PDF-Capture in den finalen Stand.

---

## 5. Licht — die teuerste Lektion dieser Session

Mehrere Iterationsrunden, weil ich (Claude) zunächst blind Werte anpasste, ohne zu sehen, was tatsächlich gerendert wird. Wichtig für die Zukunft:

**Ein Renderlabor existiert** unter `/home/claude/renderlab/render.mjs` (headless-gl + Xvfb + pngjs), aber **das ist eine Container-lokale Datei, kein Teil des Repos** — sie überlebt diese Konversation nicht. Beim nächsten Mal neu aufbauen:
```
npm install gl pngjs three@0.160.0
xvfb-run -a node render.mjs
```
**Wichtige Falle:** headless-gl unterstützt kein `OES_texture_half_float`. Three.js' PMREM-Generator braucht das für Environment-Maps — ohne Patch bleibt die Spiegelung schwarz, obwohl der Code korrekt ist (das ist genau passiert: mehrere „Belege" liefen auf einer kaputten Pipeline). Fix: `node_modules/three/build/three.module.js` patchen, `HalfFloatType` → `UnsignedByteType` im PMREM-Rendertarget. **Und: immer zuerst einen Selbsttest fahren** (weiße Environment + Spiegelkugel muss hell rendern), bevor man den eigentlichen Render beurteilt.

**Aktuelles Lichtkonzept der Werkbank:** Chrom-Studio-Environment (großflächig neutralweiße Wände + Kuppel, harte dunkle Vertikalstreifen für Kontur), eine sichtbare Werkstattlampe (Spotlight von oben) plus ein Ringlicht, das der Kamera folgt (hebt immer die kamerazugewandte Flanke). Referenz war ein Produktfoto (heller Raum, weiche Schatten) — die Belichtung wurde mehrfach gegen dieses Referenzbild verifiziert.

**Materialkalibrierung** (`MATERIALS`-Objekt) ist Andres Geschäftsdaten und wurde nicht angetastet — nur die Umgebung drumherum.

---

## 6. Archiv — was verworfen wurde und warum

| Datei | Was es war |
|---|---|
| `archiv/werkbank-v2-restyle.html` | Der ursprüngliche 4300-Zeilen-Assistent (fünf Schritte, Panel+Bühne-Layout). Hat noch STEP/STL/OBJ-Export und den PDF-Werkstattzettel (`printSheet`, jsPDF) — **siehe Abschnitt 7**. |
| `archiv/werkbank-v3-auftragsbogen.html` | Zwischenschritt: ein-Dokument-Scroll ohne die sechs Posen/Kamera-Choreografie von v6/v7. |

---

## 7. Offene Enden — bewusst nicht gemacht

1. ~~Export und PDF-Werkstattzettel~~ — **in v8 portiert** (siehe Abschnitt 4). Kunden sehen nur den Werkstattzettel; STEP/STL/OBJ liegen hinter `?werkstatt`.
2. **Gravur-Vorschau** — nicht umgesetzt (auf Wunsch ausgeschlossen).
3. **Geodaten-Relief als Oberfläche** — Andres Signature-Idee („Dein Berg auf deinem Ring"), noch nicht umgesetzt (auf Wunsch ausgeschlossen). Das Displacement-System aus der Gusskante (`displace`-Parameter in `makeRingGeometries`) wäre der technische Ansatzpunkt.
4. **`Gewerbeanmeldung`-Hinweistext** — muss raus, sobald das Gewerbe angemeldet ist. Suchwort `Gewerbeanmeldung` findet jetzt **beide** Stellen: Übergabe-Kapitel der Werkbank und die „Werkstatt im Aufbau"-Zeile der Landing.
5. **Kein Pixel-Beleg für v8:** Das Renderlabor (Abschnitt 5) wurde in dieser Session nicht neu aufgebaut. Sweep und Münzfall sind mathematisch headless verifiziert (Node + vendored Three.js: Geometrie NaN-frei über alle Zwischenwinkel, Fall endet flach auf der Ruhelage), aber nicht als Bild belegt. An Licht und Materialien wurde nichts angefasst.

---

## 8. Wie man testet, ohne die Live-Seite anzufassen

1. Lokal: ZIP entpacken, `node build.mjs`, dann `npx serve dist` → `http://localhost:3000/werkbank/`. Kein Doppelklick auf die HTML möglich (ES-Module + absolute `/vendor/`-Pfade brauchen einen Server).
2. Cloudflare-Branch-Preview: Push auf `test`, Cloudflare baut automatisch unter der `.pages.dev`-URL. Production bleibt auf `main`, solange in den Cloudflare-Settings nichts umgestellt wird.
3. Frisch angelegte Cloudflare-Pages-Projekte brauchen 10–60 Minuten, bis das SSL-Zertifikat für Hash-Subdomains (`<hash>.projekt.pages.dev`) steht — in der Zwischenzeit geht `projekt.pages.dev` (ohne Hash) meist schon.

---

## 9. Kontext für die nächste Session

Falls jemand (Mensch oder Claude) hier weitermacht: Diese Datei plus ein kurzer Blick in `src/werkbank/index.html` (Kommentarblock ganz unten im `<script type="module">`, überschrieben mit „DIE HELLE GALERIE — Werkbank v8") sollte reichen, um wieder produktiv zu werden. Das Design-System (Abschnitt 3) und die Licht-Fallstricke (Abschnitt 5) sind die zwei Stellen, an denen am meisten Zeit verloren ging — beim nächsten Mal zuerst hier nachlesen.
