export type PeriodKind = "DAILY" | "WEEKLY" | "MONTHLY" | "ANNUAL";

/** Returns an inclusive local-calendar range for reporting. */
export function getPeriodRange(kind: PeriodKind, date: Date) {
  if (Number.isNaN(date.getTime())) throw new Error("Invalid period date");
  const start = new Date(date);
  const end = new Date(date);

  if (kind === "DAILY") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (kind === "WEEKLY") {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (kind === "MONTHLY") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { from: start, to: end };
}
