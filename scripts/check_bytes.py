from pathlib import Path
p=Path('erp-backend/docker-entrypoint.sh')
b=p.read_bytes()
print('len',len(b))
print('first 8 bytes',b[:8])
print('has CR',b'\r' in b)
print('starts with BOM',b.startswith(b'\xef\xbb\xbf'))
