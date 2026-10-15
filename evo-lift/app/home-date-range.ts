function formatDateToYyyyMmDd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Home past-workout range: eight weeks back through today. */
export function getDefaultHomeDateRange(today: Date): { from: string; to: string } {
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setDate(today.getDate() - 56);
  return {
    from: formatDateToYyyyMmDd(eightWeeksAgo),
    to: formatDateToYyyyMmDd(today),
  };
}
