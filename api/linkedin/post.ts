export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  const auth = req.headers.authorization as string | undefined
  const token = auth?.replace(/^Bearer\s+/i, "") || (req.body?.token as string)
  const text = (req.body?.text as string) || ""
  if (!token) return res.status(401).json({ error: "Missing LinkedIn token" })
  if (!text) return res.status(400).json({ error: "Missing text" })
  try {
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } })
    if (!meRes.ok) return res.status(meRes.status).json({ error: "Failed to fetch profile", details: await meRes.text() })
    const me: any = await meRes.json()
    const author = `urn:li:person:${me.sub}`
    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        author,
        lifecycleState: "PUBLISHED",
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
      }),
    })
    const body = await postRes.text()
    if (!postRes.ok) return res.status(postRes.status).json({ error: "LinkedIn post failed", details: body })
    return res.status(200).json({ ok: true, body: body ? JSON.parse(body) : {} })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "post failed" })
  }
}
