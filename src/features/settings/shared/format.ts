// swapp.js:2195-2205 shows dates as the locale short date plus HH:mm:ss.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(date)
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date)
  return `${day} ${time}`
}
