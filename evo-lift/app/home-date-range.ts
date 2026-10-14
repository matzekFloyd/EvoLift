function formatDateToYyyyMmDd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Home past-workout range: one year back through today. */
export function getDefaultHomeDateRange(today: Date): { from: string; to: string } {
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  return {
    from: formatDateToYyyyMmDd(oneYearAgo),
    to: formatDateToYyyyMmDd(today),
  };
}
