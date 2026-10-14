export function formatKgTick(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
