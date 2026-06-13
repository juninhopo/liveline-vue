<script lang="ts">
import type { CSSProperties } from 'vue'

export interface LivelineTransitionProps {
  /** Key of the active child to display. Drives the cross-fade. */
  active: string
  /** Cross-fade duration in ms (default 300) */
  duration?: number
  /** Pass-through container class */
  class?: unknown
  /** Pass-through container style */
  style?: CSSProperties
}
</script>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Cross-fade between chart components (e.g. line ↔ candlestick).
 *
 * Unlike the React version, Vue slots do not expose a child's `key`, so this
 * component cannot pick "which child" to mount from a list of keyed children.
 * Instead it keys the wrapper on `active` and relies on the CONSUMER to render
 * the correct child for the current `active` value inside the default slot —
 * e.g. with a `v-if`/`v-else` or a dynamic `<component :is="...">`.
 *
 * When `active` changes, Vue's <Transition> mounts the new keyed node and
 * fades the old one out simultaneously: both panes are absolutely positioned
 * (inset:0) so they overlap, and the leaving pane gets pointer-events:none so
 * only the active child is interactive. The fade lasts `duration` ms, matching
 * the React component's `transition: opacity ${duration}ms ease`.
 *
 * @example
 * ```vue
 * <LivelineTransition :active="chartType">
 *   <Liveline v-if="chartType === 'line'" :data="data" :value="value" />
 *   <Liveline v-else mode="candle" :candles="candles" :candle-width="5" :data="data" :value="value" />
 * </LivelineTransition>
 * ```
 */
const props = withDefaults(defineProps<LivelineTransitionProps>(), {
  duration: 300,
})

// Expose duration to CSS via a custom property so the transition timing is
// driven entirely by the prop (mirrors `opacity ${duration}ms ease`).
const durationStyle = computed(() => ({
  '--liveline-fade-duration': `${props.duration}ms`,
}))
</script>

<template>
  <div class="liveline-transition" :style="durationStyle">
    <Transition>
      <div :key="active" class="liveline-transition__pane">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.liveline-transition {
  position: relative;
  width: 100%;
  height: 100%;
}

.liveline-transition__pane {
  position: absolute;
  inset: 0;
  opacity: 1;
}

/* v-enter/v-leave-active: animate opacity over `duration` ms, ease. */
.v-enter-active,
.v-leave-active {
  transition: opacity var(--liveline-fade-duration, 300ms) ease;
}

/* Incoming pane starts transparent (mirrors double-rAF opacity:0 → 1). */
.v-enter-from,
.v-leave-to {
  opacity: 0;
}

/* The leaving pane must not capture pointer events while fading out, so only
   the active child stays interactive (mirrors pointerEvents: 'none'). */
.v-leave-active {
  pointer-events: none;
}
</style>
