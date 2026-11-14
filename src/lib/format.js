// Local-time date key (YYYY-MM-DD). toISOString() is UTC and shifts the day
// for anyone east of Greenwich before their morning's UTC midnight.
export function isoDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(iso) {
  return new Date(iso + 'T00:00:00')
}

export function addDays(iso, n) {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function daysBetween(fromIso, toIso) {
  return Math.round((parseDate(toIso) - parseDate(fromIso)) / 86400000)
}

export function fmtMinutes(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

export function fmtClock(seconds) {
  const m = Math.floor(seconds / 60), s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtDate(iso, opts = { month: 'short', day: 'numeric' }) {
  return parseDate(iso).toLocaleDateString('en-US', opts)
}

export function pct(part, whole) {
  return whole ? Math.round(part / whole * 100) : 0
}

// Five score bands, shared by every view that shows a score
export function scoreBand(p) {
  if (p === 100) return { key: 'perfect', label: 'Perfect' }
  if (p >= 90)   return { key: 'excellent', label: 'Excellent' }
  if (p >= 75)   return { key: 'passing', label: 'Passing' }
  if (p >= 60)   return { key: 'borderline', label: 'Borderline' }
  return           { key: 'low', label: 'Needs work' }
}
