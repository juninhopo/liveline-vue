# liveline-vue

Real-time animated charts for **Vue 3**. Line, multi-series, and candlestick modes, canvas-rendered, 60fps, zero CSS imports.

> **A Vue 3 port of [`liveline`](https://github.com/benjitaylor/liveline) by [Benji Taylor](https://github.com/benjitaylor).**
> All credit for the original design and rendering engine goes to him. `liveline` (React) is the upstream project — if you use React, **use the original**: [`npm i liveline`](https://www.npmjs.com/package/liveline). This repo only re-authors the thin React component/hook layer as a Vue SFC + composable; the framework-agnostic core (canvas drawing, math, theming) is preserved **verbatim** from the original. MIT, original copyright retained.

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
npm run dev        # demo playground
npm run typecheck  # vue-tsc
npm run build      # library build (ES + CJS + bundled .d.ts) → dist/
```

## Credits

This is a port. The original — design, the canvas rendering engine, the entire look — is **[`liveline`](https://github.com/benjitaylor/liveline) by [Benji Taylor](https://github.com/benjitaylor)** (MIT). Please ⭐ the upstream repo. If you're on React, use [`liveline`](https://www.npmjs.com/package/liveline) directly — this package exists only to bring the same charts to Vue 3.

## License

MIT — see [`LICENSE`](./LICENSE). Original copyright © 2025-2026 Benji Taylor (`liveline`); Vue port © 2026 liveline-vue contributors. The original MIT notice is retained in full.
