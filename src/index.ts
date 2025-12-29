// date.ts (ESM)

export type DateInput = Date | number | string

type IntlFormatOpts = Intl.DateTimeFormatOptions & {
  locale?: string
  timeZone?: string
}

type RelativeOpts = {
  locale?: string
  numeric?: Intl.RelativeTimeFormatNumeric
  now?: DateInput
}

const _dtfCache = new Map<string, Intl.DateTimeFormat>()
const _rtfCache = new Map<string, Intl.RelativeTimeFormat>()

function toDate(input: DateInput): Date {
  if (input instanceof Date) return input
  if (typeof input === 'number') return new Date(input)
  return new Date(input) // expects ISO8601 or RFC2822
}

function assertValid(d: Date) {
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date')
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function stableKey(obj: Record<string, unknown>) {
  const keys = Object.keys(obj).sort()
  let out = ''
  for (const k of keys) {
    const v = obj[k]
    out += `${k}=`
    if (v === undefined) out += 'u'
    else if (v === null) out += 'n'
    else if (typeof v === 'string') out += `s:${v}`
    else if (typeof v === 'number') out += `d:${v}`
    else if (typeof v === 'boolean') out += `b:${v ? 1 : 0}`
    else out += `o:${JSON.stringify(v)}`
    out += ';'
  }
  return out
}

function getDtf(locale: string, timeZone: string | undefined, opts: Intl.DateTimeFormatOptions) {
  const key = stableKey({ locale, timeZone, ...opts })
  let dtf = _dtfCache.get(key)
  if (!dtf) {
    const o: Intl.DateTimeFormatOptions = { ...opts }
    if (timeZone) o.timeZone = timeZone
    dtf = new Intl.DateTimeFormat(locale, o)
    _dtfCache.set(key, dtf)
  }
  return dtf
}

function getRtf(locale: string, numeric: Intl.RelativeTimeFormatNumeric) {
  const key = stableKey({ locale, numeric })
  let rtf = _rtfCache.get(key)
  if (!rtf) {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric })
    _rtfCache.set(key, rtf)
  }
  return rtf
}

function formatTokens(d: Date, pattern: string) {
  // Single-pass token replacement. No chained replace calls. No recursion.
  const Y = d.getFullYear()
  const M = d.getMonth() + 1
  const D = d.getDate()
  const H = d.getHours()
  const m = d.getMinutes()
  const s = d.getSeconds()

  const map: Record<string, string> = {
    YYYY: String(Y),
    YY: String(Y).slice(-2),
    MM: pad2(M),
    M: String(M),
    DD: pad2(D),
    D: String(D),
    HH: pad2(H),
    H: String(H),
    mm: pad2(m),
    m: String(m),
    ss: pad2(s),
    s: String(s),
  }

  // Order matters: longest first to avoid partial matches.
  const re = /YYYY|YY|MM|DD|HH|mm|ss|M|D|H|m|s/g
  return pattern.replace(re, (tok) => map[tok] ?? tok)
}

export const date = {
  // Simple token-based formatting: "DD.MM.YYYY", "YYYY-MM-DD", "DD/MM/YYYY HH:mm"
  format(input: DateInput, pattern = 'YYYY-MM-DD') {
    const d = toDate(input)
    assertValid(d)
    return formatTokens(d, pattern)
  },

  // Locale/Intl formatting, cached by locale+tz+options (never by input date)
  formatIntl(input: DateInput, opts: IntlFormatOpts = {}) {
    const d = toDate(input)
    assertValid(d)

    const locale = opts.locale ?? undefined
    const timeZone = opts.timeZone ?? undefined

    const { locale: _l, timeZone: _tz, ...dtfOpts } = opts
    const dtf = getDtf(locale ?? 'en-US', timeZone, dtfOpts)
    return dtf.format(d)
  },

  // Relative time from "now" (default: Date.now), cached formatter
  relative(input: DateInput, opts: RelativeOpts = {}) {
    const now = opts.now ? toDate(opts.now) : new Date()
    const d = toDate(input)
    assertValid(now)
    assertValid(d)

    const locale = opts.locale ?? 'en-US'
    const numeric = opts.numeric ?? 'auto'
    const rtf = getRtf(locale, numeric)

    const diffMs = d.getTime() - now.getTime()
    const absMs = Math.abs(diffMs)

    const sec = 1000
    const min = 60 * sec
    const hour = 60 * min
    const day = 24 * hour
    const week = 7 * day
    const month = 30 * day
    const year = 365 * day

    let unit: Intl.RelativeTimeFormatUnit = 'second'
    let value = diffMs / sec

    if (absMs >= year) {
      unit = 'year'
      value = diffMs / year
    } else if (absMs >= month) {
      unit = 'month'
      value = diffMs / month
    } else if (absMs >= week) {
      unit = 'week'
      value = diffMs / week
    } else if (absMs >= day) {
      unit = 'day'
      value = diffMs / day
    } else if (absMs >= hour) {
      unit = 'hour'
      value = diffMs / hour
    } else if (absMs >= min) {
      unit = 'minute'
      value = diffMs / min
    }

    const rounded = value < 0 ? Math.ceil(value) : Math.floor(value)
    return rtf.format(rounded, unit)
  },

  // For tests/debugging
  _clearCaches() {
    _dtfCache.clear()
    _rtfCache.clear()
  },
}

export default date
