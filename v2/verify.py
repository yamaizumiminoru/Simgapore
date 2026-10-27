"""Verify exact tested sources, reproducible build and untouched legacy release."""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parent
html = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'Simgapore2.html'
expected = {
    'data.js': 'e2dca57dd12660c698bcc9b985e5e3edf2cf1378',
    'engine.js': '93dc7d7b9c254b449b36ffb1c60f409c6efac129',
    'ui.js': 'f5e8eec56a46321e026a29d4ffad439e5370f12b',
    'style.css': 'acb092749041321bfb99f62494ae47cba788cc5a',
    'body.html': '6e5c5ddf1a1932e8de97f20926adb08a563de684',
}
for name, target in expected.items():
    raw = (ROOT / 'src' / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if actual != target:
        raise SystemExit('Source mismatch: ' + name + ' ' + actual)
if hashlib.sha256(html.read_bytes()).hexdigest() != '101370172f06cbb37b6872a1dd2f504535b541ee92026d6fc853c16b91ea5f02':
    raise SystemExit('Distribution does not match the tested build')
legacy = html.parent / 'Simgapore.html'
if not legacy.is_file():
    raise SystemExit('Legacy HTML missing')
if hashlib.sha256(legacy.read_bytes()).hexdigest() != '00e137fa0ea82531b257ade149859805b3842121accd4861e466a6f1aa4f653f':
    raise SystemExit('Legacy HTML changed')
print('PASS: all source blobs, plain HTML SHA256 and preserved v0.6')
