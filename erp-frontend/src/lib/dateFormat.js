export function formatDate(iso) {
  try {
    if (!iso) return '';
    let d;
    // handle plain YYYY-MM-DD as local date to avoid TZ shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, day] = iso.split('-').map((p) => Number(p));
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(iso);
    }
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
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, day] = iso.split('-').map((p) => Number(p));
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(iso);
    }
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
