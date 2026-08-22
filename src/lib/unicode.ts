const BOLD_OFFSET_UPPER = 0x1D5D4 - 0x41
const BOLD_OFFSET_LOWER = 0x1D5EE - 0x61
const ITALIC_OFFSET_UPPER = 0x1D608 - 0x41
const ITALIC_OFFSET_LOWER = 0x1D622 - 0x61
const BOLD_ITALIC_OFFSET_UPPER = 0x1D63C - 0x41
const BOLD_ITALIC_OFFSET_LOWER = 0x1D656 - 0x61

function mapChar(c: string, upperOff: number, lowerOff: number) {
  const code = c.charCodeAt(0)
  if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(code + upperOff)
  if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(code + lowerOff)
  if (code >= 0x30 && code <= 0x39) return c
  return c
}
export const toBold = (s: string) => [...s].map(c => mapChar(c, BOLD_OFFSET_UPPER, BOLD_OFFSET_LOWER)).join("")
export const toItalic = (s: string) => [...s].map(c => mapChar(c, ITALIC_OFFSET_UPPER, ITALIC_OFFSET_LOWER)).join("")
export const toBoldItalic = (s: string) => [...s].map(c => mapChar(c, BOLD_ITALIC_OFFSET_UPPER, BOLD_ITALIC_OFFSET_LOWER)).join("")

export function markdownToUnicode(input: string): string {
  let out = input
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, (_, p1) => toBoldItalic(p1))
  out = out.replace(/\*\*(.+?)\*\*/g, (_, p1) => toBold(p1))
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, p1) => toItalic(p1))
  out = out.replace(/__(.+?)__/g, (_, p1) => toBold(p1))
  out = out.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, (_, p1) => toItalic(p1))
  out = out.replace(/^(\s*)[-*] /gm, "$1• ")
  out = out.replace(/->/g, "→").replace(/=>/g, "➔")
  return out
}

export function applyMarkdown(text: string, start: number, end: number, wrap: string) {
  if (start === end) return { text, start: start + wrap.length, end: start + wrap.length }
  const before = text.slice(0, start)
  const sel = text.slice(start, end)
  const after = text.slice(end)
  const wrapped = `${wrap}${sel}${wrap}`
  return { text: before + wrapped + after, start, end: start + wrapped.length }
}
