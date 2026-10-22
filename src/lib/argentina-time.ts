// Argentina's calendar, whatever the time zone of the device: the clock the database and the store use. Shared by the
// admin's promotion states (P5b) and the checkout's verification (P6a).

export interface Today {
  /** YYYY-MM-DD in Argentina. */
  date: string
  /** 0 (Sunday) to 6 (Saturday) in Argentina. */
  weekday: number
}

const argentina = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
})
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Argentina's date and weekday at `now`, whatever the time zone of this computer (the clock the database uses). */
export function argentinaToday(now: Date): Today {
  const part = (type: Intl.DateTimeFormatPartTypes) => argentina.formatToParts(now).find((p) => p.type === type)?.value
  return { date: `${part('year')}-${part('month')}-${part('day')}`, weekday: WEEKDAYS.indexOf(part('weekday') ?? '') }
}
