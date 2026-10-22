/**
 * The hourly slot key.
 *
 * A slot is the learner's LOCAL hour: 'YYYY-MM-DDTHH'. Everything that
 * rotates by the hour — the lesson, the drill — is keyed by it, so the
 * content changes when the hour does, and stays stable within the hour.
 */
export function hourSlot(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}`;
}

/** The slot one hour from now — where the model writes next. */
export function nextHourSlot(date: Date = new Date()): string {
  const next = new Date(date);
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return hourSlot(next);
}
