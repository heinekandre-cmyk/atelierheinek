# Atelier Heinek — atelierheinek.com

Privates Repo. Der Quellcode in `src/` (mit allen Kommentaren und Werkstattnotizen)
wird **nie direkt deployt** — Besucher sehen nur die minifizierte Fassung aus `dist/`.

## Struktur

```
src/
├── index.html            Eintrittsseite (kein JavaScript, keine Cookies)
├── werkbank/index.html   Ringkonfigurator — Quellfassung, voll kommentiert
├── impressum.html · datenschutz.html · robots.txt · sitemap.xml · og-image.jpg
└── vendor/               Three.js, jsPDF, Schriften — selbst gehostet (DSGVO)
build.mjs                 Build: Kommentare raus, minifizieren, CSP-Hashes → dist/_headers
```

## ⚠️ Einmalig vor dem ersten Push

Die Schriftdateien (`*.woff2`) liegen nicht im Repo-Skelett — sie müssen aus dem
bisherigen Deployment nach `src/vendor/fonts/` kopiert werden:

```
playfair-display-latin-wght-normal.woff2 · playfair-display-latin-wght-italic.woff2
archivo-latin-300-normal.woff2 · archivo-latin-400-normal.woff2 · archivo-latin-500-normal.woff2
singlong-normal.woff2 · caveat-latin-400-normal.woff2 · caveat-latin-500-normal.woff2
```

Fehlen sie, greifen die serif/sans-serif-Fallbacks — die Seite bleibt heil,
sieht aber nicht nach Atelier Heinek aus.

## Cloudflare Pages einrichten

1. Repo als **privates** GitHub-Repository anlegen und pushen.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → **Connect to Git**.
3. Einstellungen:
   - **Build command:** `npm ci && node build.mjs`
   - **Build output directory:** `dist`
4. Custom Domain `atelierheinek.com` verbinden.

Ab dann gilt: **jeder Push baut und deployt automatisch.** Kein manuelles
Hash-Rechnen, kein `_headers`-Hochladen mehr — der Build berechnet die
CSP-Hashes aller Inline-Scripts selbst und schreibt `dist/_headers`.

## Lokal bauen & prüfen

```
npm install          # einmalig
node build.mjs       # erzeugt dist/ und druckt die Hashes
npx serve dist       # optional: lokal ansehen (oder python3 -m http.server -d dist)
```

## URLs

| Pfad | Inhalt |
|---|---|
| `/` | Eintrittsseite |
| `/werkbank/` | Ringkonfigurator |
| `/impressum.html` · `/datenschutz.html` | Rechtsseiten |

Die alte Konfigurator-URL war `/` — gespeicherte Entwürfe bleiben erhalten,
da localStorage an der Domain hängt, nicht am Pfad.

## Warum kein Cookie-Banner

Die Seite setzt keine Cookies und lädt nichts von Dritten. Der Konfigurator
nutzt ausschließlich localStorage für den eigenen Entwurf des Nutzers —
rein funktional und damit einwilligungsfrei. Die Datenschutzerklärung
beschreibt das.
