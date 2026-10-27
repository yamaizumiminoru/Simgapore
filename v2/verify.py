"""Verify exact tested sources, reproducible build and untouched legacy release."""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parent
html = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'Simgapore2.html'
expected = {'body.html': '6e5c5ddf1a1932e8de97f20926adb08a563de684', 'data.js': 'e2dca57dd12660c698bcc9b985e5e3edf2cf1378', 'engine.js': 'bb0955f314b28e4ccddc0ad399250b67dac9ae78', 'presentation.css': '96cf72b75216c13da89c90ca82190eb504ba6596', 'presentation.js': '2c546b24ca3a337e170fe7aced4d26098f4e377c', 'prologue.js': '54276052e51ef4be78e12b4b4edc9a7d9f951e23', 'style.css': 'd94146cf3fc0dd0bdea7ccd21e06a6dd4e37394d', 'ui.js': 'f5e8eec56a46321e026a29d4ffad439e5370f12b'}
for name, target in expected.items():
    raw = (ROOT / 'src' / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if actual != target:
        raise SystemExit('Source mismatch: ' + name + ' ' + actual)
if hashlib.sha256(html.read_bytes()).hexdigest() != 'a0cba9e6fbfdffc4141069da9944473373229b3b26b2525dcc4d0d1f605b469c':
    raise SystemExit('Distribution does not match the tested build')
legacy = html.parent / 'Simgapore.html'
if not legacy.is_file():
    raise SystemExit('Legacy HTML missing')
if hashlib.sha256(legacy.read_bytes()).hexdigest() != '00e137fa0ea82531b257ade149859805b3842121accd4861e466a6f1aa4f653f':
    raise SystemExit('Legacy HTML changed')
print('PASS: all source blobs, plain HTML SHA256 and preserved v0.6')
