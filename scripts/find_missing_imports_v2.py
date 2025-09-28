import re
from pathlib import Path

COMP_DIR = Path('erp-frontend/src/components')
files = sorted(COMP_DIR.glob('*.jsx'))

jsx_tag_re = re.compile(r'<([A-Z][A-Za-z0-9_]*)\b')
import_block_re = re.compile(r'(?ms)^import\s.*?;')
import_default_re = re.compile(r"^import\s+([A-Za-z0-9_]+)\s+from")
import_named_re = re.compile(r"\{([^}]+)\}")
import_all_re = re.compile(r"^import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from")

function_def_re = re.compile(r"^function\s+([A-Za-z0-9_]+)\s*\(")
const_def_re = re.compile(r"^const\s+([A-Za-z0-9_]+)\s*=")
class_def_re = re.compile(r"^class\s+([A-Za-z0-9_]+)\s")
export_func_re = re.compile(r"^export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(")

report = {}
for f in files:
    text = f.read_text(encoding='utf-8')
    imports = set()
    # find import blocks
    for ib in import_block_re.findall(text):
        ib = ib.strip()
        m = import_all_re.search(ib)
        if m:
            imports.add(m.group(1))
        m = import_default_re.search(ib)
        if m:
            imports.add(m.group(1))
        m2 = import_named_re.search(ib)
        if m2:
            names = [n.strip().split(' as ')[-1] for n in m2.group(1).split(',')]
            imports.update(names)
    locals_ = set()
    for line in text.splitlines():
        s = line.strip()
        for regex in (function_def_re, const_def_re, class_def_re, export_func_re):
            m = regex.match(s)
            if m:
                locals_.add(m.group(1))
    tags = set(jsx_tag_re.findall(text))
    basename = f.stem
    missing = []
    for tag in sorted(tags):
        if tag in imports or tag in locals_ or tag == basename:
            continue
        missing.append(tag)
    if missing:
        report[str(f)] = missing

if not report:
    print('No missing imports found')
else:
    for fn, missing in report.items():
        print(fn)
        for m in missing:
            print('  -', m)
        print()
