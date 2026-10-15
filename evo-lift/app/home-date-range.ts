function formatDateToYyyyMmDd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Home past-workout range: four weeks back through today. */
export function getDefaultHomeDateRange(today: Date): { from: string; to: string } {
  const fourWeeksAgo = new Date(today);
  fourWeeksAgo.setDate(today.getDate() - 28);
  return {
    from: formatDateToYyyyMmDd(fourWeeksAgo),
    to: formatDateToYyyyMmDd(today),
  };
}
