<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, nextTick } from 'vue'
import type { LivelineProps, Momentum, DegenOptions } from './types'
import { resolveTheme, resolveSeriesPalettes, SERIES_COLORS } from './theme'
import { useLivelineEngine } from './useLivelineEngine'

defineOptions({ inheritAttrs: false })

// Function-typed prop defaults are applied in the engine getter (below) via `??`,
// NOT in withDefaults: Vue uses a function-typed prop's default AS THE VALUE, so a
// `() => fn` factory there would make formatTime return a function instead of a string.
const defaultFormatValue = (v: number) => v.toFixed(2)
const defaultFormatTime = (t: number) => {
  const d = new Date(t * 1000)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  const s = d.getSeconds().toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

const props = withDefaults(defineProps<LivelineProps>(), {
  theme: 'dark',
  color: '#3b82f6',
  window: 30,
  grid: true,
  badge: true,
  momentum: true,
  fill: true,
  scrub: true,
  loading: false,
  paused: false,
  exaggerate: false,
  badgeTail: true,
  badgeVariant: 'default',
  showValue: false,
  valueMomentumColor: false,
  tooltipY: 14,
  tooltipOutline: true,
  crosshairStyle: 'inline',
  lerpSpeed: 0.08,
  cursor: 'crosshair',
  pulse: true,
  mode: 'line',
  seriesToggleCompact: false,
})

// React aliased `window: windowSecs = 30`
const windowSecs = computed(() => props.window ?? 30)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const valueDisplayRef = ref<HTMLSpanElement | null>(null)
const windowBarRef = ref<HTMLDivElement | null>(null)
const windowBtnRefs = new Map<number, HTMLButtonElement>()
const indicatorStyle = ref<{ left: number; width: number } | null>(null)
const modeBarRef = ref<HTMLDivElement | null>(null)
const modeBtnRefs = new Map<string, HTMLButtonElement>()
const modeIndicatorStyle = ref<{ left: number; width: number } | null>(null)
const hiddenSeries = ref<Set<string>>(new Set())

function setWindowBtn(secs: number, el: Element | null) {
  if (el) windowBtnRefs.set(secs, el as HTMLButtonElement)
  else windowBtnRefs.delete(secs)
}
function setModeBtn(m: string, el: Element | null) {
  if (el) modeBtnRefs.set(m, el as HTMLButtonElement)
  else modeBtnRefs.delete(m)
}

// lastSeriesPropRef — tracks last non-empty series
let lastSeriesProp = props.series
const lastSeriesProp_r = ref(props.series)
watchEffect(() => {
  if (props.series && props.series.length > 0) {
    lastSeriesProp = props.series
    lastSeriesProp_r.value = props.series
  }
})

const palette = computed(() => {
  const p = resolveTheme(props.color, props.theme, props.background)
  if (props.lineWidth != null) p.lineWidth = props.lineWidth
  return p
})
const isDark = computed(() => props.theme === 'dark')
const isMultiSeries = computed(() => props.series != null && props.series.length > 0)
const showSeriesToggle = computed(() => (lastSeriesProp_r.value?.length ?? 0) > 1)

// Per-series palettes (memoized on series ids + colors + theme)
const seriesPalettes = computed(() => {
  if (!props.series || props.series.length === 0) return null
  return resolveSeriesPalettes(props.series, props.theme, props.background)
})

// Normalized multi-series config for the engine
const multiSeries = computed(() => {
  if (!props.series || !seriesPalettes.value) return undefined
  const sp = seriesPalettes.value
  return props.series.map((s, i) => ({
    id: s.id,
    data: s.data,
    value: s.value,
    palette: sp.get(s.id) ?? resolveTheme(s.color || SERIES_COLORS[i % SERIES_COLORS.length], props.theme, props.background),
    label: s.label,
    dashed: s.dashed,
  }))
})

// Resolve momentum prop: boolean enables auto-detect, string overrides
const showMomentum = computed(() => props.momentum !== false)
const momentumOverride = computed<Momentum | undefined>(() =>
  typeof props.momentum === 'string' ? props.momentum : undefined
)

const defaultRight = computed(() => (props.badge ? 80 : props.grid ? 54 : 12))
const pad = computed(() => ({
  top: props.padding?.top ?? 12,
  right: props.padding?.right ?? defaultRight.value,
  bottom: props.padding?.bottom ?? 28,
  left: props.padding?.left ?? 12,
}))

// Degen mode: explicit prop wins
const degenEnabled = computed(() => (props.degen != null
  ? props.degen !== false
  : false))
const degenOptions = computed<DegenOptions | undefined>(() => (degenEnabled.value
  ? (typeof props.degen === 'object' ? props.degen : {})
  : undefined))

// Window buttons state
const activeWindowSecs = ref(
  props.windows && props.windows.length > 0 ? props.windows[0].secs : windowSecs.value
)
const effectiveWindowSecs = computed(() => (props.windows ? activeWindowSecs.value : windowSecs.value))

// Measure active window button for sliding indicator
function measureWindow() {
  if (!props.windows || props.windows.length === 0) return
  const btn = windowBtnRefs.get(activeWindowSecs.value)
  const bar = windowBarRef.value
  if (btn && bar) {
    const barRect = bar.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    indicatorStyle.value = {
      left: btnRect.left - barRect.left,
      width: btnRect.width,
    }
  }
}
watch([activeWindowSecs, () => props.windows], () => { measureWindow() }, { flush: 'post' })

// Measure active mode button for sliding indicator
const activeMode = computed(() => (props.lineMode ? 'line' : 'candle'))
function measureMode() {
  if (!props.onModeChange) return
  const btn = modeBtnRefs.get(activeMode.value)
  const bar = modeBarRef.value
  if (btn && bar) {
    const barRect = bar.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    modeIndicatorStyle.value = {
      left: btnRect.left - barRect.left,
      width: btnRect.width,
    }
  }
}
watch([activeMode, () => props.onModeChange], () => { measureMode() }, { flush: 'post' })

onMounted(() => {
  nextTick(() => {
    measureWindow()
    measureMode()
  })
})

// Series toggle handler — prevent hiding the last visible series
function handleSeriesToggle(id: string) {
  const prev = hiddenSeries.value
  const next = new Set(prev)
  if (next.has(id)) {
    next.delete(id)
    props.onSeriesToggle?.(id, true)
  } else {
    // Count visible series — don't hide last one
    const totalSeries = props.series?.length ?? 0
    const visibleCount = totalSeries - next.size
    if (visibleCount <= 1) return
    next.add(id)
    props.onSeriesToggle?.(id, false)
  }
  hiddenSeries.value = next
}

const ws = computed(() => props.windowStyle ?? 'default')

useLivelineEngine(canvasRef, containerRef, () => ({
  data: props.data,
  value: props.value,
  palette: palette.value,
  windowSecs: effectiveWindowSecs.value,
  lerpSpeed: props.lerpSpeed,
  showGrid: props.grid,
  showBadge: isMultiSeries.value ? false : props.badge,
  showMomentum: isMultiSeries.value ? false : showMomentum.value,
  momentumOverride: momentumOverride.value,
  showFill: isMultiSeries.value ? false : props.fill,
  referenceLine: props.referenceLine,
  formatValue: props.formatValue ?? defaultFormatValue,
  formatTime: props.formatTime ?? defaultFormatTime,
  padding: pad.value,
  onHover: props.onHover,
  showPulse: props.pulse,
  scrub: props.scrub,
  exaggerate: props.exaggerate,
  degenOptions: isMultiSeries.value ? undefined : degenOptions.value,
  badgeTail: props.badgeTail,
  badgeVariant: props.badgeVariant,
  tooltipY: props.tooltipY,
  tooltipOutline: props.tooltipOutline,
  background: props.background,
  crosshairStyle: props.crosshairStyle,
  valueMomentumColor: props.valueMomentumColor,
  valueDisplayRef: props.showValue ? valueDisplayRef : undefined,
  orderbookData: props.orderbook,
  loading: props.loading,
  paused: props.paused,
  emptyText: props.emptyText,
  mode: props.mode,
  candles: props.candles,
  candleWidth: props.candleWidth,
  liveCandle: props.liveCandle,
  lineMode: props.lineMode,
  lineData: props.lineData,
  lineValue: props.lineValue,
  multiSeries: multiSeries.value,
  isMultiSeries: isMultiSeries.value,
  hiddenSeriesIds: hiddenSeries.value,
}))

const cursorStyle = computed(() => (props.scrub ? props.cursor : 'default'))

const activeColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.55)'))
const inactiveColor = computed(() => (isDark.value ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)'))
</script>

<template>
  <!-- Live value display — above the chart -->
  <span
    v-if="showValue"
    ref="valueDisplayRef"
    :style="{
      display: 'block',
      fontSize: 20,
      fontWeight: 500,
      fontFamily: `'SF Mono', Menlo, monospace`,
      color: isDark ? 'rgba(255,255,255,0.85)' : '#111',
      transition: 'color 0.3s',
      letterSpacing: '-0.01em',
      marginBottom: 8,
      paddingTop: 4,
      paddingLeft: pad.left,
    }"
  />

  <!-- Control bars row — window pills + mode toggle + series chips side by side -->
  <div
    v-if="(windows && windows.length > 0) || onModeChange || showSeriesToggle"
    :style="{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginLeft: pad.left }"
  >
    <!-- Time window controls -->
    <div
      v-if="windows && windows.length > 0"
      ref="windowBarRef"
      :style="{
        position: 'relative',
        display: 'inline-flex',
        gap: ws === 'text' ? 4 : 2,
        background: ws === 'text' ? 'transparent'
          : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: ws === 'rounded' ? 999 : 6,
        padding: ws === 'text' ? 0 : ws === 'rounded' ? 3 : 2,
      }"
    >
      <!-- Sliding indicator (default + rounded) -->
      <div
        v-if="ws !== 'text' && indicatorStyle"
        :style="{
          position: 'absolute',
          top: ws === 'rounded' ? 3 : 2,
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          height: ws === 'rounded' ? 'calc(100% - 6px)' : 'calc(100% - 4px)',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
          borderRadius: ws === 'rounded' ? 999 : 4,
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }"
      />
      <button
        v-for="w in windows"
        :key="w.secs"
        :ref="(el) => setWindowBtn(w.secs, el as Element | null)"
        @click="() => {
          activeWindowSecs = w.secs
          onWindowChange?.(w.secs)
        }"
        :style="{
          position: 'relative',
          zIndex: 1,
          fontSize: 11,
          padding: ws === 'text' ? '2px 6px' : '3px 10px',
          borderRadius: ws === 'rounded' ? 999 : 4,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: w.secs === activeWindowSecs ? 600 : 400,
          background: 'transparent',
          color: w.secs === activeWindowSecs ? activeColor : inactiveColor,
          transition: 'color 0.2s, background 0.15s',
          lineHeight: '16px',
        }"
      >
        {{ w.label }}
      </button>
    </div>

    <!-- Mode toggle — separate bar with its own sliding indicator -->
    <div
      v-if="onModeChange"
      ref="modeBarRef"
      :style="{
        position: 'relative',
        display: 'inline-flex',
        gap: ws === 'text' ? 4 : 2,
        background: ws === 'text' ? 'transparent'
          : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: ws === 'rounded' ? 999 : 6,
        padding: ws === 'text' ? 0 : ws === 'rounded' ? 3 : 2,
      }"
    >
      <!-- Sliding indicator -->
      <div
        v-if="ws !== 'text' && modeIndicatorStyle"
        :style="{
          position: 'absolute',
          top: ws === 'rounded' ? 3 : 2,
          left: modeIndicatorStyle.left,
          width: modeIndicatorStyle.width,
          height: ws === 'rounded' ? 'calc(100% - 6px)' : 'calc(100% - 4px)',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)',
          borderRadius: ws === 'rounded' ? 999 : 4,
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
        }"
      />
      <!-- Line icon -->
      <button
        :ref="(el) => setModeBtn('line', el as Element | null)"
        @click="onModeChange('line')"
        :style="{
          position: 'relative',
          zIndex: 1,
          padding: '5px 7px',
          borderRadius: ws === 'rounded' ? 999 : 4,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
        }"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1 8.5C2.5 8.5 3 4 5.5 4S7.5 7 8.5 7C9.5 7 10 3.5 11 3.5"
            :stroke="activeMode === 'line' ? activeColor : inactiveColor"
            :stroke-width="activeMode === 'line' ? 1.5 : 1.2"
            stroke-linecap="round"
            fill="none"
          />
        </svg>
      </button>
      <!-- Candle icon -->
      <button
        :ref="(el) => setModeBtn('candle', el as Element | null)"
        @click="onModeChange('candle')"
        :style="{
          position: 'relative',
          zIndex: 1,
          padding: '5px 7px',
          borderRadius: ws === 'rounded' ? 999 : 4,
          border: 'none',
          cursor: 'pointer',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
        }"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line x1="3.5" y1="1" x2="3.5" y2="11"
            :stroke="activeMode === 'candle' ? activeColor : inactiveColor" stroke-width="1" />
          <rect x="2" y="3" width="3" height="5" rx="0.5"
            :fill="activeMode === 'candle' ? activeColor : inactiveColor" />
          <line x1="8.5" y1="2" x2="8.5" y2="10"
            :stroke="activeMode === 'candle' ? activeColor : inactiveColor" stroke-width="1" />
          <rect x="7" y="4" width="3" height="4" rx="0.5"
            :fill="activeMode === 'candle' ? activeColor : inactiveColor" />
        </svg>
      </button>
    </div>

    <!-- Series toggle chips -->
    <div
      v-if="showSeriesToggle"
      :style="{
        display: 'inline-flex',
        gap: ws === 'text' ? 4 : 2,
        background: ws === 'text' ? 'transparent'
          : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: ws === 'rounded' ? 999 : 6,
        padding: ws === 'text' ? 0 : ws === 'rounded' ? 3 : 2,
        opacity: isMultiSeries ? 1 : 0,
        transition: 'opacity 0.4s',
        pointerEvents: isMultiSeries ? 'auto' : 'none',
      }"
    >
      <button
        v-for="(s, si) in (lastSeriesProp_r ?? [])"
        :key="s.id"
        @click="handleSeriesToggle(s.id)"
        :style="{
          position: 'relative',
          zIndex: 1,
          fontSize: 11,
          padding: seriesToggleCompact
            ? (ws === 'text' ? '2px 4px' : '5px 7px')
            : (ws === 'text' ? '2px 6px' : '3px 8px'),
          borderRadius: ws === 'rounded' ? 999 : 4,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          background: hiddenSeries.has(s.id) ? 'transparent' : (ws === 'text' ? 'transparent' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.035)')),
          color: hiddenSeries.has(s.id) ? inactiveColor : activeColor,
          opacity: hiddenSeries.has(s.id) ? 0.4 : 1,
          transition: 'opacity 0.2s, background 0.15s, color 0.2s',
          lineHeight: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: seriesToggleCompact ? 0 : 4,
        }"
      >
        <span :style="{
          width: seriesToggleCompact ? 8 : 6,
          height: seriesToggleCompact ? 8 : 6,
          borderRadius: '50%',
          background: s.color || SERIES_COLORS[si % SERIES_COLORS.length],
          flexShrink: 0,
          opacity: hiddenSeries.has(s.id) ? 0.4 : 1,
          transition: 'opacity 0.2s',
        }" />
        <template v-if="!seriesToggleCompact">{{ s.label ?? s.id }}</template>
      </button>
    </div>
  </div>

  <div
    ref="containerRef"
    :class="className"
    :style="{
      width: '100%',
      height: '100%',
      position: 'relative',
      background,
      ...style,
    }"
  >
    <canvas
      ref="canvasRef"
      :style="{ display: 'block', cursor: cursorStyle }"
    />
  </div>
</template>
