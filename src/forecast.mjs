const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const monthOffset = (month, offset) => {
  const date = new Date(month + '-01T00:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
};
const predictors = {
  average: (values) => mean(values),
  naive: (values) => values.at(-1),
  drift: (values, horizon) => values.at(-1) + horizon * (values.at(-1) - values[0]) / (values.length - 1),
};
const names = { average: 'Historical average', naive: 'Last month', drift: 'Trend with drift' };

// Amounts remain in centavos. Only closed calendar months enter training.
export function forecastRecords(records, { metric = 'sales', horizon = 3, asOf, demo = false } = {}) {
  if (!['sales', 'collections', 'bookings'].includes(metric)) throw new Error('Choose a valid forecast metric.');
  if (!Number.isInteger(horizon) || horizon < 1 || horizon > 6) throw new Error('Forecast horizon must be 1 to 6 months.');
  const current = asOf.slice(0, 7);
  const eligible = records.filter(record => record.date < current + '-01' && record.status !== 'Cancelled');
  const first = eligible.map(record => record.date.slice(0, 7)).sort()[0];
  const history = [];
  // Exclude the first observed month: records may start halfway through it.
  if (first) for (let month = monthOffset(first, 1); month < current; month = monthOffset(month, 1)) {
    const rows = eligible.filter(record => record.date.startsWith(month));
    history.push({ month, value: rows.reduce((sum, row) => sum + (metric === 'bookings' ? 1 : Number(row.amount ?? row.total ?? 0)), 0), records: rows.length });
  }
  const base = { metric, horizon, asOf, history, demo, excludedFirstMonth: first || null, cutoff: current + '-01', assumptions: 'First observed and current partial months are excluded. Missing months within the recorded history count as zero. No seasonal pattern or future booking information is assumed.' };
  if (history.length < 3) return { ...base, available: false, reason: 'At least three completed months after the first observed month are needed. Add dated records to build a reliable history.', forecast: [], evaluations: [] };
  const values = history.map(point => point.value);
  const evaluations = history.length >= 5 ? Object.keys(predictors).map(model => {
    const errors = [];
    for (let origin = 3; origin < values.length; origin++) errors.push(values[origin] - Math.max(0, predictors[model](values.slice(0, origin), 1)));
    return { model, name: names[model], folds: errors.length, mae: mean(errors.map(Math.abs)), rmse: Math.sqrt(mean(errors.map(error => error * error))) };
  }).sort((a, b) => a.rmse - b.rmse) : [];
  const model = evaluations[0]?.model || 'average';
  const deviation = Math.sqrt(mean(values.map(value => (value - mean(values)) ** 2)));
  const error = evaluations[0]?.rmse ?? deviation;
  const forecast = Array.from({ length: horizon }, (_, index) => {
    const step = index + 1;
    const value = Math.round(Math.max(0, predictors[model](values, step)));
    const spread = 1.96 * error * Math.sqrt(step);
    return { month: monthOffset(current, index), value, low: Math.round(Math.max(0, value - spread)), high: Math.round(value + spread) };
  });
  return { ...base, available: true, model, modelName: names[model], forecast, evaluations, limited: history.length < 12, rangeMethod: 'Indicative range: ±1.96 × one-month backtest RMSE × square root of horizon; historical variation is used when backtesting is unavailable. This is not a calibrated confidence interval.' };
}
