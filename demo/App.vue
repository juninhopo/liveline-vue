<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Liveline } from '../src'
import type { LivelinePoint, LivelineSeries, WindowOption } from '../src'

// ── liveline-vue playground ───────────────────────────────────────────────────
// A generic showcase: plug ANY time-series into <Liveline>. Each example below
// feeds synthetic ticks, but in your app `data`/`series` come from a WebSocket,
// polling, SSE — anything. Points are just { time: unixSeconds, value: number }.

const windows: WindowOption[] = [
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
  { label: '15m', secs: 900 },
  { label: '1h', secs: 3600 },
  { label: 'All', secs: 0 },
]

// ── Example 1 — a single live metric (requests / second) ──────────────────────
const reqWindow = ref(60)
const reqData = ref<LivelinePoint[]>([])
const reqValue = ref(0)
const reqBuf: LivelinePoint[] = []
let reqLevel = 1200

// ── Example 2 — multi-series (latency per region) with a reference line (SLO) ──
const latWindow = ref(300)
const latSeries = shallowRef<LivelineSeries[]>([])
const regions = [
  { id: 'us-east', label: 'us-east', color: '#4ade80', buf: [] as LivelinePoint[], level: 42, dashed: false },
  { id: 'eu-west', label: 'eu-west', color: '#4d9fff', buf: [] as LivelinePoint[], level: 58, dashed: true },
  { id: 'ap-south', label: 'ap-south', color: '#f59e0b', buf: [] as LivelinePoint[], level: 91, dashed: false },
]

function tick(t: number) {
  // requests/sec — random walk with the odd spike
  reqLevel += (Math.random() - 0.5) * 60
  if (Math.random() < 0.04) reqLevel += (Math.random() - 0.5) * 600
  reqLevel = Math.max(120, reqLevel)
  reqBuf.push({ time: t, value: reqLevel })

  // latency per region — each drifts independently
  for (const r of regions) {
    r.level += (Math.random() - 0.5) * 6
    r.level = Math.max(8, r.level)
    r.buf.push({ time: t, value: r.level })
  }

  // prune to ~1h
  const cutoff = t - 3600
  for (const arr of [reqBuf, ...regions.map(r => r.buf)]) {
    while (arr.length && arr[0]!.time < cutoff) arr.shift()
  }

  reqData.value = reqBuf.slice()
  reqValue.value = reqLevel
  latSeries.value = regions.map(r => ({
    id: r.id,
    data: r.buf,
    value: r.level,
    color: r.color,
    label: r.label,
    dashed: r.dashed,
  }))
}

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  const start = Math.floor(Date.now() / 1000) - 120
  for (let i = 0; i < 120; i++) tick(start + i)
  timer = setInterval(() => tick(Math.floor(Date.now() / 1000)), 500)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <main class="page">
    <header class="masthead">
      <h1>liveline<span>-vue</span></h1>
      <p>real-time animated charts for Vue 3 · canvas · 60fps · plug in any time-series</p>
    </header>

    <section class="card">
      <div class="card-head">
        <div class="title">REQUESTS / SEC</div>
        <div class="sub">single series · <code>showValue</code> · live badge · scrub to inspect</div>
      </div>
      <div class="chart">
        <Liveline
          :data="reqData"
          :value="reqValue"
          color="#4ade80"
          theme="dark"
          background="#0d1b2a"
          grid
          show-value
          :window="reqWindow"
          :windows="windows"
          :format-value="(v: number) => `${Math.round(v).toLocaleString('en-US')}/s`"
          @window-change="(s: number) => (reqWindow = s)"
          style="width: 100%; height: 100%"
        />
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <div class="title">P95 LATENCY · BY REGION</div>
        <div class="sub">multi-series · toggle chips · reference line (SLO 80ms) · click a region to isolate</div>
      </div>
      <div class="chart">
        <Liveline
          :data="[]"
          :value="0"
          :series="latSeries"
          theme="dark"
          background="#0a0b10"
          crosshair-style="box"
          grid
          :window="latWindow"
          :windows="windows"
          :reference-line="{ value: 80, label: 'SLO 80ms' }"
          :format-value="(v: number) => `${v.toFixed(0)}ms`"
          @window-change="(s: number) => (latWindow = s)"
          style="width: 100%; height: 100%"
        />
      </div>
    </section>

    <footer class="foot">
      <code>npm add liveline-vue</code> · <code>import {{ '{' }} Liveline {{ '}' }} from 'liveline-vue'</code>
    </footer>
  </main>
</template>

<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: #07080a; }
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 48px 24px 96px;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: #e7e9ee;
}
.masthead { margin-bottom: 40px; }
.masthead h1 {
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
  font-size: 30px;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  font-weight: 600;
}
.masthead h1 span { color: #4ade80; }
.masthead p { margin: 0; color: #8b90a0; font-size: 13px; }

.card {
  background: #0d0f13;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 22px 24px 26px;
  margin-bottom: 28px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.02) inset, 0 24px 48px -24px rgba(0, 0, 0, 0.8);
}
.card-head { margin-bottom: 14px; }
.title {
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 14px;
  color: #f3f4f8;
}
.sub {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7180;
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
}
.sub code, .foot code {
  color: #a9b1c2;
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 5px;
  border-radius: 4px;
}
.chart { height: 300px; width: 100%; }
.foot {
  margin-top: 40px;
  text-align: center;
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: #6b7180;
}
</style>
