<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Liveline } from '../src'
import type { LivelinePoint, LivelineSeries, WindowOption } from '../src'

// ── liveline-vue playground ───────────────────────────────────────────────────
// Plug ANY time-series into <Liveline>. Each example feeds synthetic ticks, but
// in your app `data`/`series` come from a WebSocket, polling, SSE — anything.
// Points are just { time: unixSeconds, value: number }.

const windows: WindowOption[] = [
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
  { label: '15m', secs: 900 },
  { label: '1h', secs: 3600 },
  { label: 'All', secs: 0 },
]

// 1 — single live metric (requests / second)
const reqWindow = ref(60)
const reqData = ref<LivelinePoint[]>([])
const reqValue = ref(0)
const reqBuf: LivelinePoint[] = []
let reqLevel = 1200

// 2 — multi-series (latency per region) with a reference line (SLO)
const latWindow = ref(300)
const latSeries = shallowRef<LivelineSeries[]>([])
const regions = [
  { id: 'us-east', label: 'us-east', color: '#16a34a', buf: [] as LivelinePoint[], level: 42, dashed: false },
  { id: 'eu-west', label: 'eu-west', color: '#2563eb', buf: [] as LivelinePoint[], level: 58, dashed: true },
  { id: 'ap-south', label: 'ap-south', color: '#d97706', buf: [] as LivelinePoint[], level: 91, dashed: false },
]

// 3 — price feed (mid) on a tinted custom background
const pxWindow = ref(300)
const pxData = ref<LivelinePoint[]>([])
const pxValue = ref(0)
const pxBuf: LivelinePoint[] = []
let pxLevel = 5.085

function tick(t: number) {
  // mean-revert around 1000 so the line crosses the threshold both ways
  reqLevel += (1000 - reqLevel) * 0.03 + (Math.random() - 0.5) * 130
  if (Math.random() < 0.04) reqLevel += (Math.random() - 0.5) * 500
  reqLevel = Math.max(120, reqLevel)
  reqBuf.push({ time: t, value: reqLevel })

  for (const r of regions) {
    r.level += (Math.random() - 0.5) * 6
    r.level = Math.max(8, r.level)
    r.buf.push({ time: t, value: r.level })
  }

  pxLevel += (Math.random() - 0.5) * 0.004
  pxBuf.push({ time: t, value: pxLevel })

  const cutoff = t - 3600
  for (const arr of [reqBuf, pxBuf, ...regions.map(r => r.buf)]) {
    while (arr.length && arr[0]!.time < cutoff) arr.shift()
  }

  reqData.value = reqBuf.slice()
  reqValue.value = reqLevel
  pxData.value = pxBuf.slice()
  pxValue.value = pxLevel
  latSeries.value = regions.map(r => ({ id: r.id, data: r.buf, value: r.level, color: r.color, label: r.label, dashed: r.dashed }))
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
        <div class="sub">single series · <code>threshold-colors</code> — green above 1k/s, red below · live badge</div>
      </div>
      <div class="chart">
        <Liveline
          :data="reqData"
          :value="reqValue"
          color="#16a34a"
          theme="light"
          grid
          fill
          show-value
          :window="reqWindow"
          :windows="windows"
          :reference-line="{ value: 1000, label: '1k/s' }"
          :threshold-colors="{ value: 1000, above: '#16a34a', below: '#dc2626' }"
          :format-value="(v: number) => `${Math.round(v).toLocaleString('en-US')}/s`"
          @window-change="(s: number) => (reqWindow = s)"
        />
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <div class="title">P95 LATENCY · BY REGION</div>
        <div class="sub">multi-series · toggle chips · <code>dashed</code> · reference line · <code>crosshair-style="box"</code></div>
      </div>
      <div class="chart">
        <Liveline
          :data="[]"
          :value="0"
          :series="latSeries"
          theme="light"
          crosshair-style="box"
          grid
          :window="latWindow"
          :windows="windows"
          :reference-line="{ value: 80, label: 'SLO 80ms' }"
          :format-value="(v: number) => `${v.toFixed(0)}ms`"
          @window-change="(s: number) => (latWindow = s)"
        />
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <div class="title">USD / BRL</div>
        <div class="sub">custom <code>background</code> prop · any CSS color, edge-fade matches</div>
      </div>
      <div class="chart">
        <Liveline
          :data="pxData"
          :value="pxValue"
          color="#7c3aed"
          theme="light"
          background="#faf5ff"
          grid
          show-value
          :window="pxWindow"
          :windows="windows"
          :format-value="(v: number) => `R$ ${v.toFixed(4)}`"
          @window-change="(s: number) => (pxWindow = s)"
        />
      </div>
    </section>

    <footer class="foot">
      <code>npm add liveline-vue</code> · <code>import {{ '{' }} Liveline {{ '}' }} from 'liveline-vue'</code>
    </footer>
  </main>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #f6f7f9; }
.page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px 24px 96px;
  font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
  color: #1a1c20;
}
.masthead { margin-bottom: 40px; }
.masthead h1 {
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
  font-size: 30px;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  font-weight: 600;
}
.masthead h1 span { color: #16a34a; }
.masthead p { margin: 0; color: #6b7180; font-size: 13px; }

.card {
  background: #ffffff;
  border: 1px solid #e6e8ec;
  border-radius: 16px;
  padding: 20px 22px 22px;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -16px rgba(16, 24, 40, 0.18);
}
.card-head { margin-bottom: 12px; }
.title {
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-size: 14px;
  color: #1a1c20;
}
.sub {
  margin-top: 4px;
  font-size: 12px;
  color: #8a90a0;
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
}
.sub code, .foot code {
  color: #444b5a;
  background: #f0f1f4;
  padding: 1px 5px;
  border-radius: 4px;
}
.chart { height: 280px; width: 100%; }
.foot {
  margin-top: 36px;
  text-align: center;
  font-family: "SF Mono", ui-monospace, Menlo, monospace;
  font-size: 12px;
  color: #8a90a0;
}
</style>
