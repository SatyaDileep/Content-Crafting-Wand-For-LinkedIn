export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(204).end()
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const { event, props } = body || {}
    if (!event) return res.status(400).json({ error: "Missing event" })
    console.log(JSON.stringify({ t: "telemetry", event, props, ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress, ua: req.headers["user-agent"], ts: Date.now() }))
    res.setHeader("Access-Control-Allow-Origin", "*")
    return res.status(204).end()
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || "bad request" })
  }
}
