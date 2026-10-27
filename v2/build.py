"""Build a plain, offline, single HTML file; no compression or external assets."""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parent
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'Simgapore2.html'
parts = {p: (ROOT / 'src' / p).read_text(encoding='utf-8') for p in
         ['style.css', 'body.html', 'data.js', 'engine.js', 'ui.js']}
html = ('<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<title>Simgapore 2.0 — 国を経営する</title>\n<style>\n' + parts['style.css'] +
        '\n</style>\n</head><body>\n' + parts['body.html'] + '\n<script>\n' +
        parts['data.js'] + parts['engine.js'] + '\n</script>\n<script>\n' +
        parts['ui.js'] + '\n</script></body></html>\n')
output.write_bytes(html.encode('utf-8'))
print('Built', output.name, len(html.encode('utf-8')), 'bytes; SHA256',
      hashlib.sha256(html.encode('utf-8')).hexdigest())
