export const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format((value || 0) / 100);
export const compact = value => '₱' + new Intl.NumberFormat('en-PH', { notation: 'compact', maximumFractionDigits: 1 }).format((value || 0) / 100);
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
export const pretty = value => value ? new Date(value + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
export const monthName = month => new Date(month + '-01T12:00:00').toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
export const sum = (rows, key = 'amount') => rows.reduce((total, row) => total + Number(row[key] || 0), 0);
export const payStatus = booking => booking.paid >= booking.total ? 'Paid' : booking.paid > 0 ? 'Partial' : 'Unpaid';
export async function api(path, data, signal) {
  const response = await fetch('/api/' + path, { method: data ? 'POST' : 'GET', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, signal });
  let result;
  try { result = await response.json(); } catch { throw Error('The service is unavailable. Please try again.'); }
  if (!response.ok) throw Object.assign(Error(result.error || 'Unable to complete request.'), { status: response.status });
  return result;
}
export function downloadCsv(name, headers, rows) {
  const cell = value => '"' + String(value ?? '').replace(/^[=+@\-]/, "'").replaceAll('"', '""') + '"';
  const blob = new Blob(['\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name + '.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
