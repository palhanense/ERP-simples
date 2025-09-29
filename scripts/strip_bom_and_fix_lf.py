from pathlib import Path
p = Path('erp-backend/docker-entrypoint.sh')
if not p.exists():
    print('file not found', p)
    raise SystemExit(1)
# read as binary
b = p.read_bytes()
# remove UTF-8 BOM if present
if b.startswith(b'\xef\xbb\xbf'):
    print('BOM found, removing')
    b = b[3:]
# replace CRLF/CR with LF
b = b.replace(b'\r\n', b'\n').replace(b'\r', b'\n')
# ensure starts with shebang
if not b.startswith(b'#!'):
    print('warning: file does not start with shebang')
# write back without BOM
p.write_bytes(b)
print('fixed', p)
print('first bytes', list(b[:8]))
print('contains CR?', b.find(b'\r')!=-1)
print('size', len(b))
