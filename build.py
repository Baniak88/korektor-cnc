"""Buduje Korektor CNC: wersję artefaktu (artifact.html) i paczkę PWA (dist/korektor-cnc/ + ZIP)."""
import hashlib, json, os, shutil, zipfile
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'dist', 'korektor-cnc')

def rd(name):
    with open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()

def fill(s):
    return s.replace('/*{{CORE}}*/', rd('core.js')).replace('/*{{DATA}}*/', rd('data.js')).replace('/*{{CODES}}*/', rd('codes.js')).replace('/*{{UI}}*/', rd('ui.js')).replace('/*{{SIM}}*/', rd('simui.js')).replace('/*{{AI}}*/', rd('ai.js'))
head = rd('head.html')
body = fill(rd('body.html'))

# --- Artefakt (szkielet dokłada doctype/head/body) ---
art = (head + body).replace('<!--PWA_FLAG-->', '').replace('<!--PWA_TAIL-->', '')
with open(os.path.join(ROOT, 'artifact.html'), 'w', encoding='utf-8') as f:
    f.write(art)

# --- PWA ---
if os.path.isdir(DIST):
    shutil.rmtree(DIST)
os.makedirs(os.path.join(DIST, 'icons'))

pwa_head = '''<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#E7EAE7">
<meta name="description" content="Korekcja zużycia z pomiaru, zmiana wymiarów w G-code, kody i alarmy Fanuc/Sinumerik.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
'''
pwa_flag = '<script>window.KCNC_PWA = true;</script>'
pwa_tail = '''<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        nw && nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller && window.toast) toast('Nowa wersja — uruchom aplikację ponownie');
        });
      });
    }).catch(function () {});
  });
}
</script>'''
html = pwa_head + head + '\n</head>\n<body>\n' + body.replace('<!--PWA_FLAG-->', pwa_flag).replace('<!--PWA_TAIL-->', pwa_tail) + '\n</body>\n</html>\n'
with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
    f.write(html)

# Wersja pamięci offline liczona z treści — każda zmiana sama aktualizuje aplikację na telefonach
VERSION = hashlib.sha1(html.encode('utf-8')).hexdigest()[:10]

manifest = {
    "name": "Korektor CNC",
    "short_name": "Korektor CNC",
    "description": "Korekcja zużycia z pomiaru, zmiana wymiarów w G-code, kody i alarmy Fanuc/Sinumerik.",
    "lang": "pl",
    "id": "./",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "any",
    "background_color": "#111416",
    "theme_color": "#1B5D8F",
    "categories": ["productivity", "utilities"],
    "share_target": {"action": "./?st=1", "method": "GET", "params": {"title": "title", "text": "text", "url": "url"}},
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
        {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ],
    "shortcuts": [
        {"name": "Korekcja z pomiaru", "short_name": "Korekcja", "url": "./#korekcja", "icons": [{"src": "icons/icon-96.png", "sizes": "96x96"}]},
        {"name": "Zmiana programu", "short_name": "Program", "url": "./#gcode", "icons": [{"src": "icons/icon-96.png", "sizes": "96x96"}]},
        {"name": "Alarmy", "short_name": "Alarmy", "url": "./#alarmy", "icons": [{"src": "icons/icon-96.png", "sizes": "96x96"}]}
    ]
}
with open(os.path.join(DIST, 'manifest.webmanifest'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

sw = '''// Korektor CNC — service worker (praca offline)
const CACHE = 'kcnc-v%s';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-96.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Strona: najpierw sieć (świeża wersja), offline z pamięci
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Czcionki Google: z pamięci, w tle odświeżane
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
  }
});
''' % VERSION
with open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf-8') as f:
    f.write(sw)

# --- Ikony: znak Ø (średnica) na niebieskim tle ---
BLUE = (27, 93, 143, 255)
WHITE = (255, 255, 255, 255)
def glyph(d, size, scale):
    c = size / 2
    r = size * 0.205 * scale
    w = max(2, int(size * 0.075 * scale))
    d.ellipse([c - r, c - r, c + r, c + r], outline=WHITE, width=w)
    L = r * 1.0
    d.line([(c - L, c + L), (c + L, c - L)], fill=WHITE, width=w)
    for p in [(c - L, c + L), (c + L, c - L)]:
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=WHITE)

def icon(size, maskable=False):
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable:
        d.rectangle([0, 0, S, S], fill=BLUE)
        glyph(d, S, 0.78)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BLUE)
        glyph(d, S, 1.0)
    return im.resize((size, size), Image.LANCZOS)

for s in (96, 192, 512):
    icon(s).save(os.path.join(DIST, 'icons', 'icon-%d.png' % s))
icon(512, True).save(os.path.join(DIST, 'icons', 'maskable-512.png'))

readme = '''KOREKTOR CNC — instalacja na Androidzie
========================================

Najprościej: otwórz w Chrome adres GitHub Pages projektu (patrz README w repozytorium) i wybierz
menu ⋮ → "Zainstaluj aplikację". Poniżej instrukcja dla własnego hostingu.

1. W hPanel Hostinger otwórz Menedżer plików wybranej domeny (np. worcesterwebmaker.co.uk).
2. W public_html utwórz folder, np. "cnc".
3. Wgraj do niego zawartość tej paczki (index.html, manifest.webmanifest, sw.js, folder icons)
   — albo wgraj ZIP i użyj "Rozpakuj".
4. Na telefonie otwórz w Chrome: https://twojadomena/cnc/
5. Menu ⋮ → "Zainstaluj aplikację" (albo przycisk "Zainstaluj aplikację" w arkuszu maszyny w aplikacji).

Ikona "Korektor CNC" pojawi się na ekranie. Aplikacja działa bez internetu po pierwszym uruchomieniu.
Przytrzymanie ikony pokazuje skróty: Korekcja, Program, Alarmy.

Aktualizacja: wgraj nowe pliki w to samo miejsce. Aplikacja pobierze je przy następnym uruchomieniu z internetem.

Wymagany HTTPS (na Hostingerze SSL jest w standardzie).
Wszystkie dane (dziennik korekt, ustawienia) zostają tylko na telefonie — nic nie jest wysyłane na serwer.
'''
with open(os.path.join(DIST, 'INSTRUKCJA.txt'), 'w', encoding='utf-8') as f:
    f.write(readme)

zpath = os.path.join(ROOT, 'dist', 'korektor-cnc.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    for base, _, files in os.walk(DIST):
        for fn in sorted(files):
            full = os.path.join(base, fn)
            z.write(full, os.path.relpath(full, DIST))
print('OK', os.path.getsize(zpath), 'bytes, wersja', VERSION)
