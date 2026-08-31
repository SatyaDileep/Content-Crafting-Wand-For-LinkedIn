export const LINKEDIN_CLIENT_ID = (import.meta.env.VITE_LINKEDIN_CLIENT_ID as string | undefined) || ""

function redirectUri() {
  return `${location.origin}/auth/linkedin/callback`
}

export function linkedinAuthUrl(state = "") {
  if (!LINKEDIN_CLIENT_ID) return ""
  const scope = encodeURIComponent("r_liteprofile r_emailaddress w_member_social")
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri())}&scope=${scope}&state=${encodeURIComponent(state || Math.random().toString(36).slice(2))}`
}

export function beginLinkedInLogin() {
  const url = linkedinAuthUrl()
  if (!url) return false
  location.href = url
  return true
}

export function shareOnLinkedIn(text: string) {
  const intent = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`
  window.open(intent, "_blank", "noopener,noreferrer")
}

export async function postViaApi(text: string): Promise<boolean> {
  const token = localStorage.getItem("cc_linkedin_token")
  if (!token) return false
  try {
    const res = await fetch("/api/linkedin/post", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text }),
    })
    return res.ok
  } catch {
    return false
  }
}
