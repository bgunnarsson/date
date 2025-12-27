# @bgunnarsson/date

Tiny date helper with:
- `Intl.DateTimeFormat` presets (`date`, `time`, `datetime`) with caching
- `Intl.RelativeTimeFormat` (`relative`) with caching
- Minimal token formatting (`YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`) using local time

No dependencies.

## Install

```bash
pnpm add @bgunnarsson/date
# or
npm i @bgunnarsson/date
# or
yarn add @bgunnarsson/date
```

## Import

```ts
import date from '@bgunnarsson/date'
import type { DateInput } from '@bgunnarsson/date'
```

## Usage

```ts
import date from '@bgunnarsson/date'

// Presets (Intl)
date.format(new Date(), 'date')      // e.g. "Dec 27, 2025"
date.format(new Date(), 'time')      // e.g. "21:05"
date.format(new Date(), 'datetime')  // e.g. "Dec 27, 2025, 21:05"

// Relative (Intl.RelativeTimeFormat)
date.format(Date.now() + 5 * 60_000, 'relative') // "in 5 minutes"
date.format(Date.now() - 2 * 60_000, 'relative') // "2 minutes ago"

// Token pattern (fast, local time; ignores locale/timeZone)
date.format(new Date(), 'DD.MM.YYYY')     // "27.12.2025"
date.format(new Date(), 'YYYY-MM-DD')     // "2025-12-27"
date.format(new Date(), 'YYYY-MM-DD HH:mm:ss')
```

## API

### Types

```ts
export type DateInput = Date | number | string
type FormatOpts = Intl.DateTimeFormatOptions & { locale?: string; timeZone?: string }
type RelativeOpts = { locale?: string; numeric?: Intl.RelativeTimeFormatNumeric }
type Preset = 'date' | 'time' | 'datetime' | 'relative'
```

### `date.format(input, presetOrPattern, opts?)`

```ts
date.format(input: DateInput, presetOrPattern: Preset | string, opts: FormatOpts = {}): string
```

Behavior:

- `'relative'` → `Intl.RelativeTimeFormat`
- `'date' | 'time' | 'datetime'` → `Intl.DateTimeFormat`
- Token pattern detected → local-time token formatter
- Anything else → falls back to `'date'`

#### Locale and time zone

`format` accepts all `Intl.DateTimeFormatOptions`, plus:

- `opts.locale`: passed to `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`
- `opts.timeZone`: forwarded into `Intl.DateTimeFormat` options

```ts
date.format('2025-12-27T21:00:00Z', 'datetime', {
  locale: 'is-IS',
  timeZone: 'Atlantic/Reykjavik',
})

date.format(Date.now() - 86_400_000, 'relative', {
  locale: 'en-GB',
  numeric: 'auto',
})
```

### `date.addDays(input, days)`

```ts
date.addDays(input: DateInput, days: number): Date
```

Adds `days` in **UTC** (not local time). Returns a new `Date`.

```ts
const d = date.addDays('2025-12-27', 7)
date.format(d, 'date', { timeZone: 'UTC' })
```

## Token patterns

Supported tokens (case-sensitive):

- `YYYY` year (4-digit)
- `MM` month (01–12)
- `DD` day (01–31)
- `HH` hours (00–23)
- `mm` minutes (00–59)
- `ss` seconds (00–59)

Notes:

- Token patterns always use **local time** (`getFullYear`, `getMonth`, etc.).
- `locale` / `timeZone` options are ignored for token patterns.

## Relative time thresholds

Unit selection by absolute difference to `Date.now()`:

- `< 1 hour` → minutes
- `< 1 day` → hours
- `< 1 week` → days
- `>= 1 week` → weeks

Rounding uses `Math.round`.

## Caching

- `Intl.DateTimeFormat` and `Intl.RelativeTimeFormat` instances are cached in Maps.
- Keys are JSON strings of:
  - `[locale, timeZone, options]` (DTF)
  - `[locale, numeric]` (RTF)

## Edge cases

- Parsing uses `new Date(input)` for `number | string`. ISO 8601 strings are safest.
- `'YYYY-MM-DD'` parsing is engine-dependent; prefer full ISO with timezone if you need absolute correctness.
- For stable cross-timezone output, use presets with an explicit `timeZone`.

## License

MIT

