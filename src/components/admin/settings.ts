export function parsePositiveIntegerInput(value: string, fallback: number): number {
  const numeric = Number.parseInt(value, 10)
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return fallback
  }

  return numeric
}
