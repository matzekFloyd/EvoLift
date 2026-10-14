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

export type CompactActivityWeek = {
  weekStart: string;
  sets: number;
  isCurrentWeek: boolean;
  weekLabel: string;
};

function weekRangeLabel(weekStart: string): string {
  const start = activityDateToLocalDate(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const startText = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(start);
  const endText = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(end);
  return `${startText}-${endText}`;
}

export function buildCompactActivityWeeks(
  data: ActivityDayPoint[],
  today: Date,
): CompactActivityWeek[] {
  const currentWeekStart = currentWeekStartKey(today);
  const countsByWeek = new Map<string, number>();
  for (const item of data) {
    const weekStart = activityDateKey(startOfWeekMonday(activityDateToLocalDate(item.date)));
    countsByWeek.set(weekStart, (countsByWeek.get(weekStart) ?? 0) + item.sets);
  }
  return [...countsByWeek.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-10)
    .map(([weekStart, sets]) => ({
      weekStart,
      sets,
      isCurrentWeek: weekStart === currentWeekStart,
      weekLabel: weekStart === currentWeekStart ? "This week" : weekRangeLabel(weekStart),
    }));
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
  const slicedWeeks =
    weeks.length > fixedVisibleWeeks ? weeks.slice(weeks.length - fixedVisibleWeeks) : weeks;
  const paddingWeeksNeeded = Math.max(0, fixedVisibleWeeks - slicedWeeks.length);
  const paddedWeeks = [...slicedWeeks];
  if (paddingWeeksNeeded > 0 && slicedWeeks.length > 0) {
    const firstVisibleWeekStart = activityDateToLocalDate(slicedWeeks[0][0].date);
    for (let i = paddingWeeksNeeded; i >= 1; i -= 1) {
      const weekStart = new Date(firstVisibleWeekStart);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const fillerWeek: HeatmapDay[] = [];
      for (let day = 0; day < 7; day += 1) {
        const current = new Date(weekStart);
        current.setDate(weekStart.getDate() + day);
        fillerWeek.push({
          date: activityDateKey(current),
          sets: 0,
          workouts: 0,
          isInRange: false,
        });
      }
      paddedWeeks.unshift(fillerWeek);
    }
  }
  return paddedWeeks;
}
