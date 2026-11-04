/** Today's local date as YYYY-MM-DD, the format used by date inputs. */
export function todayIsoDate(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function formatMatchDate(isoDate: string): string {
  // Parse as local midnight; a bare YYYY-MM-DD would be read as UTC.
  return new Date(`${isoDate}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
