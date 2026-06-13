# liveline-vue

Real-time animated charts for **Vue 3** — line, multi-series & candlestick, canvas-rendered, 60fps, zero CSS imports.

> **A Vue 3 port of [`liveline`](https://github.com/benjitaylor/liveline) by [Benji Taylor](https://github.com/benjitaylor).**
> All credit for the original design and rendering engine goes to him. `liveline` (React) is the upstream project — if you use React, **use the original**: [`npm i liveline`](https://www.npmjs.com/package/liveline). This package only re-authors the thin React component/hook layer as a Vue SFC + composable; the framework-agnostic core (canvas drawing, math, theming) is preserved **verbatim** from the original. MIT, original copyright retained.

<p align="center">
  <img src="https://raw.githubusercontent.com/juninhopo/liveline-vue/main/docs/hero.png" alt="liveline-vue — two live charts" width="100%" />
</p>

```bash
npm add liveline-vue   # peer dependency: vue >=3.3
```

## Why

- **Canvas, 60fps** — smooth value interpolation, momentum glow, live badge, pulsing dot. No SVG reflow, no DOM thrash.
- **Drop-in** — pass a growing `{ time, value }[]` and the latest `value`; the chart animates between updates.
- **Batteries included** — multi-series with auto toggle chips, candlesticks, reference lines, time-window buttons, crosshair scrubbing — all built in.
- **Tiny & typed** — ~27 kB gzipped, full TypeScript types, `vue` is the only peer dep.

## Single series

<p align="center">
  <img src="https://raw.githubusercontent.com/juninhopo/liveline-vue/main/docs/single-series.png" alt="single series with live badge, fill and showValue" width="100%" />
</p>

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Liveline } from 'liveline-vue'
import type { LivelinePoint } from 'liveline-vue'

const data = ref<LivelinePoint[]>([])   // grow from a WS/poll: { time: unixSeconds, value }
const value = ref(0)                     // latest value — smoothly interpolated
</script>

<template>
  <div style="height: 300px">
    <Liveline :data="data" :value="value" color="#4ade80" theme="dark" show-value />
  </div>
</template>
```

The component fills its parent — set a height on the parent.

## Multi-series + scrub + reference line

The crosshair follows your cursor and reads out every series at that instant. Toggle chips appear automatically for 2+ series; click one to isolate.

<p align="center">
  <img src="https://raw.githubusercontent.com/juninhopo/liveline-vue/main/docs/crosshair.png" alt="multi-series with crosshair tooltip and reference line" width="100%" />
</p>

```vue
<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { Liveline } from 'liveline-vue'
import type { LivelineSeries, WindowOption } from 'liveline-vue'

const series = shallowRef<LivelineSeries[]>([])   // [{ id, data, value, color, label? }]
const windowSecs = ref(300)
const windows: WindowOption[] = [
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
  { label: '15m', secs: 900 },
]
</script>

<template>
  <div style="height: 300px">
    <Liveline
      :data="[]"
      :value="0"
      :series="series"
      theme="dark"
      :window="windowSecs"
      :windows="windows"
      :reference-line="{ value: 80, label: 'SLO 80ms' }"
      :format-value="(v) => `${v.toFixed(0)}ms`"
      @window-change="(s) => (windowSecs = s)"
    />
  </div>
</template>
```

## Props

Same surface as the React original. Highlights:

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `data` / `value` | `LivelinePoint[]` / `number` | — | Single-series input |
| `series` | `LivelineSeries[]` | — | Multi-series; overrides `data`/`value` |
| `theme` | `'light' \| 'dark'` | `'dark'` | |
| `color` | `string` | `'#3b82f6'` | Accent; palette derived from it |
| `window` | `number` | `30` | Visible window (seconds) |
| `windows` | `WindowOption[]` | — | Built-in time-range buttons |
| `referenceLine` | `{ value, label? }` | — | Dashed threshold line |
| `grid` · `fill` · `badge` · `momentum` · `pulse` · `scrub` | `boolean` | `true` | Feature flags |
| `showValue` | `boolean` | `false` | Large live value overlay |
| `exaggerate` | `boolean` | `false` | Tight Y-axis so small moves fill the height |
| `mode` · `candles` · `candleWidth` · `liveCandle` | — | — | Candlestick mode |
| `formatValue` · `formatTime` | `(n) => string` | sensible | Axis / badge formatting |

React callback props map to Vue events: `onWindowChange` → `@window-change`, `onModeChange` → `@mode-change`, `onSeriesToggle` → `@series-toggle`, `onHover` → `@hover`. See [`src/types.ts`](./src/types.ts) for the full typed list.

## Develop

```bash
npm install
npm run dev        # demo playground
npm run typecheck  # vue-tsc
npm run build      # library build (ES + CJS + bundled .d.ts) → dist/
```

## Credits

This is a port. The original — design, the canvas rendering engine, the entire look — is **[`liveline`](https://github.com/benjitaylor/liveline) by [Benji Taylor](https://github.com/benjitaylor)** (MIT). Please ⭐ the upstream repo. If you're on React, use [`liveline`](https://www.npmjs.com/package/liveline) directly — this package exists only to bring the same charts to Vue 3.

## License

MIT — see [`LICENSE`](./LICENSE). Original copyright © 2025-2026 Benji Taylor (`liveline`); Vue port © 2026 liveline-vue contributors. The original MIT notice is retained in full.
