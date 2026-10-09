import { forecastRecords } from './forecast.mjs';

export function packageForecast(packages, records, { horizon = 3, metric = 'bookings', asOf, demo = false }) {
  const eligible = records.filter(row => row.status !== 'Cancelled' && row.date <= asOf);
  const rows = packages.map(pkg => {
    const bookings = eligible.filter(row => row.package_id === pkg.id);
    const prediction = forecastRecords(bookings, { horizon, metric, asOf, demo });
    return { id: pkg.id, name: pkg.name, destination: pkg.destination, active: pkg.active,
      bookings: bookings.length, sales: bookings.reduce((total, row) => total + row.total, 0),
      available: Boolean(pkg.active && prediction.available),
      reason: !pkg.active ? 'Inactive package; excluded from future demand rankings.' : prediction.reason,
      months: prediction.history.length, method: prediction.modelName,
      estimate: pkg.active && prediction.available ? prediction.forecast.reduce((total, point) => total + point.value, 0) : null,
      nextMonth: pkg.active && prediction.available ? prediction.forecast[0] : null,
      forecast: prediction.forecast, evaluations: prediction.evaluations };
  });
  const projected = rows.filter(row => row.available).sort((a, b) => b.estimate - a.estimate || a.name.localeCompare(b.name));
  let previous = null, rank = 0;
  projected.forEach((row, index) => { if (row.estimate !== previous) rank = index + 1; row.rank = rank; previous = row.estimate; });
  const historical = [...rows].sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name));
  return { metric, horizon, asOf, demo, projected, historical,
    unavailable: rows.filter(row => !row.available),
    unlinkedBookings: eligible.filter(row => !row.package_id).length,
    assumptions: 'Recorded totals include non-cancelled bookings through today. Each prediction excludes that package’s first observed month and the current partial month; at least three remaining completed months are required. Missing months after the first sale count as zero. Rankings compare eligible active packages only; tied estimates share a rank. Forecasts start with the current month and are planning estimates, not guaranteed sales.' };
}
