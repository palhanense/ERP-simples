export function formatDate(iso) {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return iso || '';
  }
}

export function formatDateTime(iso) {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch (e) {
    return iso || '';
  }
}

export function combineDateWithTime(dateYmd, timeIso) {
  // dateYmd: 'YYYY-MM-DD', timeIso: any ISO string
  if (!dateYmd) return null;
  try {
    const parts = dateYmd.split('-').map((p) => Number(p));
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    const t = timeIso ? new Date(timeIso) : new Date();
    const hh = t.getHours();
    const mm = t.getMinutes();
    const ss = t.getSeconds();
    const dt = new Date();
    dt.setFullYear(y, m - 1, d);
    dt.setHours(hh, mm, ss, 0);
    return dt.toISOString();
  } catch (e) {
    return null;
  }
}

export function combineDateWithNow(dateYmd) {
  return combineDateWithTime(dateYmd, new Date().toISOString());
}
