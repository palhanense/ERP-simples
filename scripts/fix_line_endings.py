import io
from pathlib import Path

p = Path('erp-backend/docker-entrypoint.sh')
text = p.read_text(encoding='utf-8')
# Replace CRLF and CR with LF
text = text.replace('\r\n', '\n').replace('\r', '\n')
p.write_text(text, encoding='utf-8')
print('fixed', p)
