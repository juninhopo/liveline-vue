# liveline-vue

Real-time animated charts for **Vue 3**. Line, multi-series, and candlestick modes, canvas-rendered, 60fps, zero CSS imports.

A faithful Vue port of [`liveline`](https://github.com/benjitaylor/liveline) (React) by Benji Taylor — same canvas engine, same look, Vue-idiomatic API. The framework-agnostic core (drawing, math, theming) is preserved verbatim; only the React component/hook layer was re-authored as a Vue SFC + composable.

## Install

```bash
npm add liveline-vue
# peer dependency: vue >=3.3
```

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { Liveline } from 'liveline-vue'
import type { LivelinePoint } from 'liveline-vue'

const data = ref<LivelinePoint[]>([])   // grow this from a WS/poll: { time: unixSeconds, value }
const value = ref(0)                     // latest value — smoothly interpolated
</script>

<template>
  <div style="height: 300px">
    <Liveline :data="data" :value="value" color="#3b82f6" theme="dark" />
  </div>
</template>
```

The component fills its parent — set a height on the parent. Pass `data` as a growing array of points and `value` as the latest number; the chart interpolates smoothly between updates.

## Multi-series

```vue
<Liveline
  :data="[]"
  :value="0"
  :series="series"
  theme="dark"
  :windows="[{ label: '1m', secs: 60 }, { label: '15m', secs: 900 }]"
  @window-change="(secs) => (windowSecs = secs)"
/>
```

Pass `series` (`{ id, data, value, color, label? }[]`) instead of `data`/`value` to draw multiple lines sharing the same axes. Toggle chips appear automatically for 2+ series.

## Props

Same surface as the React original (`theme`, `color`, `grid`, `badge`, `momentum`, `fill`, `scrub`, `exaggerate`, `showValue`, `referenceLine`, `windows`, `formatValue`, `formatTime`, `mode`/`candles` for candlesticks, `series` for multi-line, …). React callback props map to Vue events: `onWindowChange` → `@window-change`, `onModeChange` → `@mode-change`, `onSeriesToggle` → `@series-toggle`, `onHover` → `@hover`.

See `src/types.ts` for the full typed prop list.

## Develop

```bash
npm install
npm run dev        # demo playground (reproduces the arbitragem dashboard charts)
npm run typecheck  # vue-tsc
npm run build      # library build (ES + CJS + bundled .d.ts) → dist/
```

## License

MIT. Port of `liveline` (MIT, © Benji Taylor).
