/**
 * SLA Business Hours Calculator
 *
 * Calculates elapsed business hours between two dates, excluding
 * weekends and holidays. Configurable work schedule.
 */

export interface BusinessHoursConfig {
  /** Work days as ISO day numbers (1=Mon, 2=Tue, ..., 7=Sun). Default: Mon-Fri */
  workdays: number[];
  /** Work start hour (24h format). Default: 8 */
  startHour: number;
  /** Work end hour (24h format). Default: 17 */
  endHour: number;
  /** Holiday dates as ISO strings (YYYY-MM-DD) */
  holidays: string[];
}

export const DEFAULT_CONFIG: BusinessHoursConfig = {
  workdays: [1, 2, 3, 4, 5], // Mon-Fri
  startHour: 8,
  endHour: 17,
  holidays: [],
};

/**
 * Check if a date falls on a business day (not weekend, not holiday)
 */
export function isBusinessDay(date: Date, config: BusinessHoursConfig = DEFAULT_CONFIG): boolean {
  // getDay returns 0=Sun..6=Sat, convert to ISO: 1=Mon..7=Sun
  const isoDay = date.getDay() === 0 ? 7 : date.getDay();
  if (!config.workdays.includes(isoDay)) return false;

  // Check holidays
  const dateStr = date.toISOString().slice(0, 10);
  if (config.holidays.includes(dateStr)) return false;

  return true;
}

/**
 * Get business hours in a single day between start and end times.
 * If the date is not a business day, returns 0.
 */
function getBusinessHoursInDay(
  date: Date,
  fromHour: number,
  toHour: number,
  config: BusinessHoursConfig
): number {
  if (!isBusinessDay(date, config)) return 0;

  const effectiveStart = Math.max(fromHour, config.startHour);
  const effectiveEnd = Math.min(toHour, config.endHour);

  return Math.max(0, effectiveEnd - effectiveStart);
}

/**
 * Calculate total business hours elapsed between two dates.
 */
export function calculateBusinessHours(
  start: Date | string,
  end: Date | string,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;

  if (endDate <= startDate) return 0;

  const hoursPerDay = config.endHour - config.startHour;
  if (hoursPerDay <= 0) return 0;

  // Get fractional hours from the start/end times
  const startHourFrac = startDate.getHours() + startDate.getMinutes() / 60;
  const endHourFrac = endDate.getHours() + endDate.getMinutes() / 60;

  // Same day case
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  if (startDay.getTime() === endDay.getTime()) {
    return getBusinessHoursInDay(startDay, startHourFrac, endHourFrac, config);
  }

  // Multi-day: first partial day + full days + last partial day
  let total = 0;

  // Hours remaining in first day
  total += getBusinessHoursInDay(startDay, startHourFrac, config.endHour, config);

  // Full days in between
  const nextDay = new Date(startDay);
  nextDay.setDate(nextDay.getDate() + 1);

  while (nextDay.getTime() < endDay.getTime()) {
    if (isBusinessDay(nextDay, config)) {
      total += hoursPerDay;
    }
    nextDay.setDate(nextDay.getDate() + 1);
  }

  // Hours in the last day
  total += getBusinessHoursInDay(endDay, config.startHour, endHourFrac, config);

  return Math.max(0, total);
}

/**
 * Add a given number of business hours to a start date.
 * Returns the resulting Date.
 */
export function addBusinessHours(
  start: Date | string,
  hours: number,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): Date {
  const startDate = typeof start === 'string' ? new Date(start) : new Date(start.getTime());

  if (hours <= 0) return startDate;

  const hoursPerDay = config.endHour - config.startHour;
  let remaining = hours;
  const current = new Date(startDate);

  // If starting before business hours, move to start of business
  let currentHour = current.getHours() + current.getMinutes() / 60;
  if (currentHour < config.startHour) {
    current.setHours(config.startHour, 0, 0, 0);
    currentHour = config.startHour;
  }
  // If starting after business hours, move to next business day start
  if (currentHour >= config.endHour) {
    current.setDate(current.getDate() + 1);
    current.setHours(config.startHour, 0, 0, 0);
    // Skip to next business day
    while (!isBusinessDay(current, config)) {
      current.setDate(current.getDate() + 1);
    }
    currentHour = config.startHour;
  }

  // Skip non-business days at start
  while (!isBusinessDay(current, config)) {
    current.setDate(current.getDate() + 1);
    current.setHours(config.startHour, 0, 0, 0);
  }

  // Consume remaining hours
  while (remaining > 0) {
    if (!isBusinessDay(current, config)) {
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, 0, 0, 0);
      continue;
    }

    currentHour = current.getHours() + current.getMinutes() / 60;
    const availableToday = config.endHour - Math.max(currentHour, config.startHour);

    if (remaining <= availableToday) {
      const finalHour = Math.max(currentHour, config.startHour) + remaining;
      const wholeHour = Math.floor(finalHour);
      const minutes = Math.round((finalHour - wholeHour) * 60);
      current.setHours(wholeHour, minutes, 0, 0);
      remaining = 0;
    } else {
      remaining -= availableToday;
      current.setDate(current.getDate() + 1);
      current.setHours(config.startHour, 0, 0, 0);
    }
  }

  return current;
}

/**
 * Get the SLA deadline for a request created at `start` with `slaHours` business hours.
 */
export function getSLADeadline(
  start: Date | string,
  slaHours: number,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): Date {
  return addBusinessHours(start, slaHours, config);
}

/**
 * Get SLA status for a request.
 * Returns a ratio of elapsed business hours to SLA hours.
 * >= 1.0 means SLA is breached.
 */
export function getSLARatio(
  start: Date | string,
  slaHours: number,
  config: BusinessHoursConfig = DEFAULT_CONFIG
): number {
  if (slaHours <= 0) return 0;
  const elapsed = calculateBusinessHours(start, new Date(), config);
  return elapsed / slaHours;
}

/**
 * Format business hours into a human-readable string.
 */
export function formatBusinessHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(hours / 9); // assuming 9h work day
  const remaining = hours % 9;
  if (remaining > 0) {
    return `${days}d ${Math.round(remaining)}h`;
  }
  return `${days}d`;
}
