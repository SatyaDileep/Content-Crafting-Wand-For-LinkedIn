export type ViewportId = "desktop" | "mobile"

export type FoldConfig = { chars: number; maxLines: number; charsPerLine: number }

export const FOLD_CONFIGS: Record<ViewportId, FoldConfig> = {
  desktop: { chars: 210, maxLines: 3, charsPerLine: 70 },
  mobile: { chars: 140, maxLines: 2, charsPerLine: 48 },
}

export type FoldResult = {
  foldAt: number
  visible: string
  hidden: string
  isFolded: boolean
  isEarlyFold: boolean
  reason: "chars" | "lines" | "none"
  linesUsed: number
  charsUsed: number
}

function graphemeLength(s: string): number {
  return [...s].length
}

function countLogicalLines(text: string, charsPerLine: number): number {
  if (!text) return 0
  const rawLines = text.split("\n")
  let count = 0
  for (const line of rawLines) {
    if (line === "") { count += 1; continue }
    const len = graphemeLength(line)
    if (len === 0) { count += 1; continue }
    count += Math.max(1, Math.ceil(len / charsPerLine))
  }
  return count
}

function foldAtForLines(text: string, maxLines: number, charsPerLine: number): number {
  const graphemes = [...text]
  if (graphemes.length === 0) return 0
  let counted = 0
  let idx = 0
  const raw = text.split("\n")
  let gPos = 0
  for (let li = 0; li < raw.length; li++) {
    const line = raw[li]
    const isEmpty = line === ""
    const need = isEmpty ? 1 : Math.max(1, Math.ceil(graphemeLength(line) / charsPerLine))
    if (counted + need > maxLines) {
      const remaining = maxLines - counted
      if (remaining <= 0) return gPos
      if (isEmpty) return gPos
      const allowedChars = remaining * charsPerLine
      return gPos + allowedChars
    }
    counted += need
    gPos += graphemeLength(line) + (li < raw.length - 1 ? 1 : 0)
    idx = gPos
    if (counted >= maxLines) return idx
  }
  return graphemes.length
}

export function getFold(text: string, viewport: ViewportId): FoldResult {
  const cfg = FOLD_CONFIGS[viewport]
  const gLen = graphemeLength(text)
  if (gLen === 0) return { foldAt: 0, visible: "", hidden: "", isFolded: false, isEarlyFold: false, reason: "none", linesUsed: 0, charsUsed: 0 }
  const charFoldAt = Math.min(cfg.chars, gLen)
  const lineFoldAt = foldAtForLines(text, cfg.maxLines, cfg.charsPerLine)
  const foldAt = Math.min(charFoldAt, lineFoldAt)
  const isFolded = gLen > foldAt || countLogicalLines(text, cfg.charsPerLine) > cfg.maxLines
  let reason: FoldResult["reason"] = "none"
  if (isFolded) reason = lineFoldAt < charFoldAt ? "lines" : "chars"
  const graphemes = [...text]
  const visible = graphemes.slice(0, foldAt).join("")
  const hidden = graphemes.slice(foldAt).join("")
  const linesUsed = countLogicalLines(visible, cfg.charsPerLine)
  const isEarlyFold = reason === "lines" && gLen <= cfg.chars
  return { foldAt, visible, hidden, isFolded, isEarlyFold, reason, linesUsed, charsUsed: graphemeLength(visible) }
}

export function snapToWordBoundary(text: string, foldAt: number): number {
  const g = [...text]
  if (foldAt <= 0 || foldAt >= g.length) return foldAt
  if (g[foldAt] === " " || g[foldAt] === "\n") return foldAt
  let i = foldAt
  while (i > 0 && g[i - 1] !== " " && g[i - 1] !== "\n" && foldAt - i < 20) i--
  if (i > 0 && g[i - 1] === " ") return i
  return foldAt
}
