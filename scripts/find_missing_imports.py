import re
from pathlib import Path

COMP_DIR = Path('erp-frontend/src/components')
files = sorted(COMP_DIR.glob('*.jsx'))

jsx_tag_re = re.compile(r'<([A-Z][A-Za-z0-9_]*)\b')
import_default_re = re.compile(r"^import\s+([A-Za-z0-9_]+)\s+from\s+['\"]")
import_named_re = re.compile(r"^import\s+\{([^}]+)\}\s+from\s+['\"]")
import_all_re = re.compile(r"^import\s+\*\s+as\s+([A-Za-z0-9_]+)\s+from\s+['\"]")
function_def_re = re.compile(r"^function\s+([A-Za-z0-9_]+)\s*\(")
const_def_re = re.compile(r"^const\s+([A-Za-z0-9_]+)\s*=")
class_def_re = re.compile(r"^class\s+([A-Za-z0-9_]+)\s")
export_func_re = re.compile(r"^export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(")

report = {}
for f in files:
    text = f.read_text(encoding='utf-8')
    imports = set()
    locals_ = set()
    for line in text.splitlines():
        m = import_default_re.match(line.strip())
        if m:
            imports.add(m.group(1))
            continue
        m = import_named_re.match(line.strip())
        if m:
            names = [n.strip().split(' as ')[-1] for n in m.group(1).split(',')]
            imports.update(names)
            continue
        m = import_all_re.match(line.strip())
        if m:
            imports.add(m.group(1))
            continue
        m = function_def_re.match(line.strip())
        if m:
            locals_.add(m.group(1))
            continue
        m = const_def_re.match(line.strip())
        if m:
            locals_.add(m.group(1))
            continue
        m = class_def_re.match(line.strip())
        if m:
            locals_.add(m.group(1))
            continue
        m = export_func_re.match(line.strip())
        if m:
            locals_.add(m.group(1))
            continue
    tags = set(jsx_tag_re.findall(text))
    # exclude built-in react primitives that are capitalized (Fragment) or those imported from React
    # Also exclude names that are the same as the filename (component defined as default export without name)
    basename = f.stem
    missing = []
    for tag in sorted(tags):
        if tag in imports or tag in locals_ or tag == basename:
            continue
        # also exclude intrinsic HTML components mistakenly matched (e.g., Svg components?) keep heuristic: if tag is one of known html list ignore
        # we'll include all and let human inspect
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
