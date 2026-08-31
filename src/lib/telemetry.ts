type Props = Record<string, string | number | boolean | undefined>

const URL = import.meta.env.VITE_TELEMETRY_URL as string | undefined
const ENABLED = (import.meta.env.VITE_TELEMETRY_ENABLED as string | undefined) !== "0"
const DEBUG = import.meta.env.DEV

export function track(event: string, props?: Props) {
  try {
    if (!ENABLED) return
    if (typeof navigator !== "undefined" && (navigator as any).doNotTrack === "1") return
    const payload = JSON.stringify({
      event,
      props: props || {},
      ts: Date.now(),
      path: typeof location !== "undefined" ? location.pathname : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
    })
    if (DEBUG) console.debug("[telemetry]", event, props)
    const g = window as any
    if (g.va?.track) g.va.track(event, props)
    if (g.plausible) g.plausible(event, { props })
    if (!URL) return
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" })
      const ok = navigator.sendBeacon(URL, blob)
      if (ok) return
    }
    fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {})
  } catch {}
}
