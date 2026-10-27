"""Verify exact tested sources, reproducible build and untouched legacy release."""
from pathlib import Path
import hashlib
import sys

ROOT = Path(__file__).resolve().parent
html = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / 'Simgapore2.html'
expected = {
    'data.js': 'e2dca57dd12660c698bcc9b985e5e3edf2cf1378',
    'engine.js': '19de5dc5714e357dfc2a978fb0c9be07076ff552',
    'ui.js': '88922b701d8474d582a605e97f196489ff7dc8ea',
    'style.css': 'acb092749041321bfb99f62494ae47cba788cc5a',
    'body.html': 'ba29f9beff4bb59cc59aa5e27b772f3ee7000183',
}
for name, target in expected.items():
    raw = (ROOT / 'src' / name).read_bytes()
    actual = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if actual != target:
        raise SystemExit('Source mismatch: ' + name + ' ' + actual)
if hashlib.sha256(html.read_bytes()).hexdigest() != 'df493dcd3f21424975e0e631fd1807aa3caeb53164265551dcc579296d756495':
    raise SystemExit('Distribution does not match the tested build')
legacy = html.parent / 'Simgapore.html'
if not legacy.is_file():
    raise SystemExit('Legacy HTML missing')
if hashlib.sha256(legacy.read_bytes()).hexdigest() != '00e137fa0ea82531b257ade149859805b3842121accd4861e466a6f1aa4f653f':
    raise SystemExit('Legacy HTML changed')
print('PASS: all source blobs, plain HTML SHA256 and preserved v0.6')
