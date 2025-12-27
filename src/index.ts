export type DateInput = Date | number | string
type FormatOpts = Intl.DateTimeFormatOptions & { locale?: string; timeZone?: string }
type RelativeOpts = { locale?: string; numeric?: Intl.RelativeTimeFormatNumeric }

type Preset = 'date' | 'time' | 'datetime' | 'relative'

const _dtfCache = new Map<string, Intl.DateTimeFormat>()
const _rtfCache = new Map<string, Intl.RelativeTimeFormat>()

function toDate(input: DateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

function assertValid(d: Date) {
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function dtf(locale: string | undefined, timeZone: string | undefined, opts: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify([locale ?? null, timeZone ?? null, opts])
  const hit = _dtfCache.get(key)
  if (hit) return hit
  const fmt = new Intl.DateTimeFormat(locale, { ...opts, timeZone })
  _dtfCache.set(key, fmt)
  return fmt
}

function rtf(locale: string | undefined, numeric: Intl.RelativeTimeFormatNumeric) {
  const key = JSON.stringify([locale ?? null, numeric])
  const hit = _rtfCache.get(key)
  if (hit) return hit
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric })
  _rtfCache.set(key, fmt)
  return fmt
}

function formatPreset(d: Date, preset: Exclude<Preset, 'relative'>, opts: FormatOpts) {
  if (preset === 'date') {
    return dtf(opts.locale, opts.timeZone, { year: 'numeric', month: 'short', day: '2-digit', ...opts }).format(d)
  }
  if (preset === 'time') {
    return dtf(opts.locale, opts.timeZone, { hour: '2-digit', minute: '2-digit', ...opts }).format(d)
  }
  return dtf(opts.locale, opts.timeZone, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...opts,
  }).format(d)
}

function formatRelative(d: Date, opts: RelativeOpts) {
  const now = Date.now()
  const diffMs = d.getTime() - now
  const abs = Math.abs(diffMs)

  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  const fmt = rtf(opts.locale, opts.numeric ?? 'auto')

  if (abs < hour) return fmt.format(Math.round(diffMs / minute), 'minute')
  if (abs < day) return fmt.format(Math.round(diffMs / hour), 'hour')
  if (abs < week) return fmt.format(Math.round(diffMs / day), 'day')
  return fmt.format(Math.round(diffMs / week), 'week')
}

// minimal token patterns (local time)
function formatTokensLocal(d: Date, pattern: string) {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = d.getHours()
  const mm = d.getMinutes()
  const ss = d.getSeconds()

  return pattern
    .replace(/YYYY/g, `${y}`)
    .replace(/MM/g, pad2(m))
    .replace(/DD/g, pad2(day))
    .replace(/HH/g, pad2(hh))
    .replace(/mm/g, pad2(mm))
    .replace(/ss/g, pad2(ss))
}

const TOKEN_RE = /Y{4}|M{2}|D{2}|H{2}|m{2}|s{2}/

const date = {
  format(input: DateInput, presetOrPattern: Preset | string, opts: FormatOpts = {}) {
    const d = toDate(input)
    assertValid(d)

    if (presetOrPattern === 'relative') return formatRelative(d, opts)

    if (presetOrPattern === 'date' || presetOrPattern === 'time' || presetOrPattern === 'datetime') {
      return formatPreset(d, presetOrPattern, opts)
    }

    // token pattern (fast, local time)
    if (TOKEN_RE.test(presetOrPattern)) return formatTokensLocal(d, presetOrPattern)

    // fallback: treat as Intl options preset "date"
    return formatPreset(d, 'date', opts)
  },

  addDays(input: DateInput, days: number) {
    const d = toDate(input)
    assertValid(d)
    const out = new Date(d.getTime())
    out.setUTCDate(out.getUTCDate() + days)
    return out
  },
}

export default date

