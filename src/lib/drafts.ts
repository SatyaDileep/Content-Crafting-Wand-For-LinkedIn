export type Draft = { id: string; content: string; title: string; updatedAt: number }
const KEY = "cc_drafts"
export function loadDrafts(): Draft[] {
  try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : [] } catch { return [] }
}
export function saveDrafts(drafts: Draft[]) {
  try { localStorage.setItem(KEY, JSON.stringify(drafts.slice(0, 50))) } catch {}
}
export function upsertDraft(drafts: Draft[], content: string): Draft[] {
  const title = content.split("\n").find(l=>l.trim())?.slice(0,60) || "Untitled"
  const id = Date.now().toString(36)
  const next = [{ id, content, title, updatedAt: Date.now() }, ...drafts].slice(0,50)
  saveDrafts(next); return next
}
