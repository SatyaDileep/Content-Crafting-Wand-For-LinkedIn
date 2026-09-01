export function encodeShare(content: string, extra: Record<string,string> = {}): string {
  const payload = JSON.stringify({ content, ...extra })
  return btoa(unescape(encodeURIComponent(payload))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")
}
export function decodeShare(hash: string): any {
  try {
    const b64 = hash.replace(/-/g,"+").replace(/_/g,"/")
    const json = decodeURIComponent(escape(atob(b64)))
    return JSON.parse(json)
  } catch { return null }
}
export function getHashPayload(): string | null {
  const h = location.hash
  const m = h.match(/share=([^&]+)/)
  return m ? m[1] : null
}
