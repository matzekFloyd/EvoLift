export type ActivityDayPoint = {
  date: string;
  workouts: number;
  sets: number;
};

export function activityDateToLocalDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  return new Date(year, month - 1, day);
}

export function startOfWeekMonday(value: Date): Date {
  const date = new Date(value);
  const dayOfWeek = date.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7;
  date.setDate(date.getDate() - offsetToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function activityDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentWeekStartKey(today: Date): string {
  return activityDateKey(startOfWeekMonday(today));
}

export type HeatmapDay = {
  date: string;
  sets: number;
  workouts: number;
  isInRange: boolean;
};

export function buildActivityHeatmapWeeks(data: ActivityDayPoint[]): HeatmapDay[][] {
  if (data.length === 0) {
    return [];
  }
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const setsByDate = new Map(sortedData.map((item) => [item.date, item.sets]));
  const workoutsByDate = new Map(sortedData.map((item) => [item.date, item.workouts]));
  const firstDate = activityDateToLocalDate(sortedData[0].date);
  const lastDate = activityDateToLocalDate(sortedData[sortedData.length - 1].date);
  const firstWeekStart = startOfWeekMonday(firstDate);
  const lastWeekStart = startOfWeekMonday(lastDate);

  const weeks: HeatmapDay[][] = [];
  const cursor = new Date(firstWeekStart);
  while (cursor <= lastWeekStart) {
    const week: HeatmapDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + i);
      const dateKey = activityDateKey(day);
      const isInRange = day >= firstDate && day <= lastDate;
      week.push({
        date: dateKey,
        sets: isInRange ? (setsByDate.get(dateKey) ?? 0) : 0,
        workouts: isInRange ? (workoutsByDate.get(dateKey) ?? 0) : 0,
        isInRange,
      });
    }
    weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
  }

  const fixedVisibleWeeks = 26;
  if (weeks.length > fixedVisibleWeeks) {
    return weeks.slice(weeks.length - fixedVisibleWeeks);
  }
  return weeks;
}
