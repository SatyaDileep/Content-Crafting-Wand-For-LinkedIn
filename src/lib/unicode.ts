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
export const toStrikethrough = (s: string) => [...s].map(c => {
  const code = c.charCodeAt(0)
  if (code >= 0x41 && code <= 0x5a) return String.fromCodePoint(code + 0x0336) // strikethrough combining
  if (code >= 0x61 && code <= 0x7a) return String.fromCodePoint(code + 0x0336)
  return c + "\u0336"
}).join("")

export function markdownToUnicode(input: string): string {
  let out = input
  // Bold-italic first
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, (_, p1) => toBoldItalic(p1))
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, (_, p1) => toBold(p1))
  // Italic
  out = out.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_, p1) => toItalic(p1))
  // Strikethrough
  out = out.replace(/~~(.+?)~~/g, (_, p1) => toStrikethrough(p1))
  // Underline (Unicode combining — LinkedIn doesn't fully support, but we attempt)
  // Underline via markdown __ is not natively supported on LinkedIn — skip conversion
  // Double underline markdown → bold (best-effort)
  out = out.replace(/__(.+?)__/g, (_, p1) => toBold(p1))
  // Single underscore italic
  out = out.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, (_, p1) => toItalic(p1))
  // Bullet lists
  out = out.replace(/^(\s*)[-*] /gm, "$1• ")
  // Arrows
  out = out.replace(/->/g, "→").replace(/=>/g, "➔")
  return out
}

/**
 * Convert markdown to simple HTML for rendering in card/feed previews.
 * Supports: bold, italic, strikethrough, bullet lists, ordered lists, line breaks.
 */
export function markdownToHtml(input: string): string {
  if (!input) return ""
  const lines = input.split("\n")
  const htmlLines: string[] = []
  let inUl = false
  let inOl = false

  function closeLists() {
    if (inUl) { htmlLines.push("</ul>"); inUl = false }
    if (inOl) { htmlLines.push("</ol>"); inOl = false }
  }

  function inlineFormat(s: string): string {
    let r = s
    r = r.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    r = r.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    r = r.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    r = r.replace(/~~(.+?)~~/g, "<s>$1</s>")
    r = r.replace(/__(.+?)__/g, "<strong>$1</strong>")
    r = r.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>")
    return r
  }

  for (const line of lines) {
    const ulMatch = line.match(/^(\s*)[-*] (.*)/)
    const olMatch = line.match(/^(\s*)\d+\. (.*)/)

    if (ulMatch) {
      if (!inUl) { closeLists(); htmlLines.push("<ul>"); inUl = true }
      htmlLines.push(`<li>${inlineFormat(ulMatch[2])}</li>`)
    } else if (olMatch) {
      if (!inOl) { closeLists(); htmlLines.push("<ol>"); inOl = true }
      htmlLines.push(`<li>${inlineFormat(olMatch[2])}</li>`)
    } else {
      closeLists()
      if (line.trim() === "") {
        htmlLines.push("<br/>")
      } else {
        htmlLines.push(`<p>${inlineFormat(line)}</p>`)
      }
    }
  }
  closeLists()
  return htmlLines.join("\n")
}

export function applyMarkdown(text: string, start: number, end: number, wrap: string) {
  if (start === end) return { text, start: start + wrap.length, end: start + wrap.length }
  const before = text.slice(0, start)
  const sel = text.slice(start, end)
  const after = text.slice(end)
  const wrapped = `${wrap}${sel}${wrap}`
  return { text: before + wrapped + after, start, end: start + wrapped.length }
}
