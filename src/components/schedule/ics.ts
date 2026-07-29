/**
 * Minimal RFC 5545 calendar file, generated in the browser.
 *
 * A hosted calendar service would be overkill here: the event has no
 * attendees list to manage and no updates to push, so a downloadable .ics is
 * both simpler and better for privacy.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Formats an instant as a UTC timestamp: `20260727T143000Z`. */
function toUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

/**
 * Escapes and folds a property. RFC 5545 caps lines at 75 octets, and some
 * calendar clients genuinely reject longer ones.
 */
function property(name: string, value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

  const line = `${name}:${escaped}`
  if (line.length <= 75) return line

  const chunks: string[] = [line.slice(0, 75)]
  let rest = line.slice(75)
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`)
    rest = rest.slice(74)
  }
  if (rest) chunks.push(` ${rest}`)
  return chunks.join('\r\n')
}

export function buildIcs({
  uid,
  start,
  durationMinutes,
  title,
  description,
  location,
}: {
  uid: string
  start: Date
  durationMinutes: number
  title: string
  description?: string
  location?: string
}): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Watercooler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    property('UID', `${uid}@watercooler`),
    property('DTSTAMP', toUtcStamp(new Date())),
    property('DTSTART', toUtcStamp(start)),
    property('DTEND', toUtcStamp(end)),
    property('SUMMARY', title),
  ]

  if (description) lines.push(property('DESCRIPTION', description))
  if (location) lines.push(property('LOCATION', location))

  lines.push('END:VEVENT', 'END:VCALENDAR')

  // CRLF is mandatory, not stylistic.
  return lines.join('\r\n')
}

/** Triggers a download of the given event. Browser only. */
export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(url)
}
