// ═══════════════════════════════════════════════════════════════════════
// Atelier Heinek · Build
//
// Erzeugt aus src/ den Deployment-Ordner dist/:
//   · HTML-Kommentare entfernt (der Quellcode bleibt privat im Repo)
//   · <style> minifiziert (csso), <script> minifiziert & gemangelt (terser)
//   · importmap und JSON-LD kompaktiert
//   · SHA-256-Hashes ALLER ausführbaren Inline-Scripts berechnet und
//     automatisch in dist/_headers (CSP) geschrieben — kein Hash-Drift mehr.
//
// Aufruf:  node build.mjs        (Cloudflare Pages: Build-Befehl,
//                                 Build-Ausgabeverzeichnis: dist)
// ═══════════════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { minify as terserMinify } from 'terser';
import { minify as cssoMinify } from 'csso';

const SRC = 'src', DIST = 'dist';
const hashes = new Set();          // CSP script-src Hashes über alle Seiten
const report = [];

// ── dist frisch aufsetzen ────────────────────────────────────────────────
rmSync(DIST, { recursive: true, force: true });
cpSync(SRC, DIST, { recursive: true });

// ── alle HTML-Dateien einsammeln ─────────────────────────────────────────
function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const sha256b64 = (s) => createHash('sha256').update(s, 'utf8').digest('base64');

for (const file of htmlFiles(DIST)) {
  let html = readFileSync(file, 'utf8');
  const before = html.length;

  // 1) Script- und Style-Blöcke herauslösen und durch Platzhalter ersetzen,
  //    damit das HTML-Kommentar-Stripping nicht in JS/CSS hineinschneidet.
  const blocks = [];
  html = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (m) => { blocks.push(m); return `\u0000BLOCK${blocks.length - 1}\u0000`; });

  // 2) HTML-Kommentare entfernen (auch den Übergabe-Block am Dateiende)
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  //    Mehrfach-Leerzeilen zusammenziehen — Struktur bleibt lesbar genug,
  //    Whitespace-Kollaps im Markup wäre riskant (pre, Inline-Abstände).
  html = html.replace(/\n{3,}/g, '\n\n');

  // 3) Blöcke einzeln minifizieren und wieder einsetzen
  for (let i = 0; i < blocks.length; i++) {
    const m = /^(<script\b[^>]*>)([\s\S]*?)(<\/script>)$/i.exec(blocks[i]);
    let out;
    if (m) {
      const [, open, body, close] = m;
      const type = (/type\s*=\s*["']?([\w+/.-]+)/i.exec(open)?.[1] || '').toLowerCase();
      if (/\bsrc\s*=/i.test(open)) {
        out = blocks[i];                                    // externes Script: unangetastet
      } else if (type === 'application/ld+json' || type === 'importmap') {
        const compact = JSON.stringify(JSON.parse(body));   // JSON kompaktieren
        out = open + compact + close;
        if (type === 'importmap') hashes.add(sha256b64(compact)); // importmap ist ausführbar → CSP-Hash
      } else {                                              // module oder klassisches Script
        const min = await terserMinify(body, {
          module: type === 'module',
          compress: { passes: 2 },
          mangle: true,
          format: { comments: false },
        });
        if (min.error) throw min.error;
        out = open + min.code + close;
        hashes.add(sha256b64(min.code));
      }
    } else {
      const s = /^(<style\b[^>]*>)([\s\S]*?)(<\/style>)$/i.exec(blocks[i]);
      out = s[1] + cssoMinify(s[2]).css + s[3];
    }
    html = html.replace(`\u0000BLOCK${i}\u0000`, () => out);
  }

  writeFileSync(file, html);
  report.push(`${relative(DIST, file).padEnd(24)} ${before} → ${html.length} Zeichen`);
}

// ── _headers erzeugen: Sicherheits-Header + CSP mit frischen Hashes ─────
const scriptHashes = [...hashes].map((h) => `'sha256-${h}'`).join(' ');
writeFileSync(join(DIST, '_headers'), `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' ${scriptHashes}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Vendor-Dateien ändern sich praktisch nie → lange cachen.
/vendor/*
  Cache-Control: public, max-age=604800

# Schriften sind versioniert-stabil → ein Jahr, immutable.
/vendor/fonts/*
  Cache-Control: public, max-age=31536000, immutable

# hand.obj ist Klartext (1,2 MB). Als text/plain ausgeliefert komprimiert
# Cloudflare es automatisch (Brotli/Gzip) → ~70-80 % kleiner beim Laden.
/vendor/models/*.obj
  Content-Type: text/plain; charset=utf-8
`);

console.log('Build fertig.\n' + report.join('\n'));
console.log('\nCSP script-src Hashes (automatisch in dist/_headers):');
for (const h of hashes) console.log('  sha256-' + h);
