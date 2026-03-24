export function formatScore(score: number | null | undefined) {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return "0";
  }

  return Math.max(0, Math.min(100, Math.round(score))).toString();
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function truncate(text: string, maxLength = 120) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}
