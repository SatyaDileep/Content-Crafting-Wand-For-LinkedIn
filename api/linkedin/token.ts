export default async function handler(req: any, res: any) {
  const code = (req.query?.code as string) || (req.body?.code as string)
  const redirect_uri = (req.query?.redirect_uri as string) || (req.body?.redirect_uri as string)
  if (!code) return res.status(400).json({ error: "Missing code" })
  const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.VITE_LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  if (!clientId || !clientSecret || !redirect_uri) {
    return res.status(501).json({ error: "LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET and pass redirect_uri." })
  }
  try {
    const r = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json(data)
    return res.status(200).json(data)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "token exchange failed" })
  }
}
