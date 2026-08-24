import { useRef, useState, useMemo, useEffect } from "react"
import { toPng } from "html-to-image"
import { markdownToUnicode, markdownToHtml } from "./lib/unicode"
import { callGemini } from "./lib/gemini"
import { useAuth } from "./lib/auth"
import AiBar from "./components/AiBar"
import SettingsModal from "./components/SettingsModal"

/* ── Constants ─────────────────────────────────────── */
const FOLD = 210
const DEFAULT_POST = `Your catchy title here — make it **bold** and irresistible.

This is the hook. You have 3 lines (~210 chars) before LinkedIn collapses your post with "…see more". Make it count.

**Adipiscing mauris laoreet at pulvinar dui mi vitae vel malesuada.**
• This is a bullet point
• And another one
• Three is a crowd

What's your take? Drop a comment 👇

#LinkedInTips #ContentCreation #PersonalBranding`

const GRADIENTS = [
  { id: "indigo-deep", bg: "linear-gradient(135deg, #1A237E, #5B4F8B)", text: "#f0f0f0" },
  { id: "navy-pink", bg: "linear-gradient(135deg, #1D2B64, #F8CDDA)", text: "#f0f0f0" },
  { id: "purple-violet", bg: "linear-gradient(135deg, #5B21B6, #4C1D95)", text: "#f0f0f0" },
  { id: "teal-navy", bg: "linear-gradient(135deg, #163654, #2c5282)", text: "#f0f0f0" },
  { id: "steel-blue", bg: "linear-gradient(135deg, #2D4059, #6a82fb)", text: "#f0f0f0" },
  { id: "forest", bg: "linear-gradient(135deg, #44806A, #1B5E20)", text: "#f0f0f0" },
  { id: "magenta", bg: "linear-gradient(135deg, #44005C, #5C228E)", text: "#f0f0f0" },
  { id: "coral-yellow", bg: "linear-gradient(135deg, #FF6B6B, #FFCD6B)", text: "#1a1a1a" },
  { id: "royal-purple", bg: "linear-gradient(135deg, #4A00E0, #8E2DE2)", text: "#f0f0f0" },
  { id: "navy-steel", bg: "linear-gradient(135deg, #1C2B54, #3B5F99)", text: "#f0f0f0" },
  { id: "emerald", bg: "linear-gradient(135deg, #00A86B, #004D40)", text: "#f0f0f0" },
  { id: "lavender-purple", bg: "linear-gradient(135deg, #E2B0FF, #9F2CFF)", text: "#1a1a1a" },
  { id: "ocean-teal", bg: "linear-gradient(135deg, #4C93B3, #153E73)", text: "#f0f0f0" },
  { id: "gold", bg: "linear-gradient(135deg, #E0B46A, #A67C4A)", text: "#1a1a1a" },
  { id: "berry", bg: "linear-gradient(135deg, #B32D6A, #6A1440)", text: "#f0f0f0" },
  { id: "sage", bg: "linear-gradient(135deg, #7C9861, #4E5E40)", text: "#f0f0f0" },
  { id: "burnt-orange", bg: "linear-gradient(135deg, #FF7B5B, #E2483E)", text: "#1a1a1a" },
]

/* ── Theme hook ────────────────────────────────────── */
function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return false
  })
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return [dark, setDark] as const
}

/* ── Shared input class ────────────────────────────── */
const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-zinc-500"

/* ── Main ──────────────────────────────────────────── */
export default function App() {
  const { apiKey } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<"preview" | "card">("preview")
  const [cardSubTab, setCardSubTab] = useState<"edit" | "style">("edit")
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop")
  const [dark, setDark] = useTheme()
  const [showFold, setShowFold] = useState(true)
  const [expanded, setExpanded] = useState(false)

  /* Editor state */
  const [content, setContent] = useState(DEFAULT_POST)

  /* Profile state */
  const [name, setName] = useState("Satya Dileep Kumar Thotakura")
  const [headline, setHeadline] = useState("Product Manager | Pegasystems · Building in public")
  const [avatar, setAvatar] = useState("https://i.pravatar.cc/200?img=33")
  const [linkedinUrl, setLinkedinUrl] = useState("https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/")

  /* Avatar as data URL (for CORS-safe export) */
  const [avatarDataUrl, setAvatarDataUrl] = useState("")
  useEffect(() => {
    if (!avatar) { setAvatarDataUrl(""); return }
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const c = document.createElement("canvas")
        c.width = img.naturalWidth; c.height = img.naturalHeight
        c.getContext("2d")!.drawImage(img, 0, 0)
        setAvatarDataUrl(c.toDataURL("image/png"))
      } catch { setAvatarDataUrl("") }
    }
    img.onerror = () => setAvatarDataUrl("")
    img.src = avatar
  }, [avatar])
  const resolvedAvatar = avatarDataUrl || avatar

  /* Card state */
  const [gradient, setGradient] = useState(GRADIENTS[2])
  const [cardHeader, setCardHeader] = useState("AI-Byte Series #Day24")
  const [cardTitle, setCardTitle] = useState("Your catchy title here")
  const [thought, setThought] = useState("")
  const [cardWidth, setCardWidth] = useState(500)
  const [textColor, setTextColor] = useState("#f0f0f0")

  /* UI state */
  const [copied, setCopied] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  /* Derived */
  const unicode = useMemo(() => markdownToUnicode(content), [content])
  const cardHtml = useMemo(() => markdownToHtml(content), [content])
  const thoughtHtml = useMemo(() => markdownToHtml(thought), [thought])
  const stats = useMemo(() => ({
    chars: content.length,
    words: content.trim() ? content.trim().split(/\s+/).length : 0,
    lines: content.split("\n").length,
  }), [content])
  const beforeFold = content.slice(0, FOLD)
  const pastFold = content.length > FOLD

  /* ── Actions ────────────────────────────── */
  function insertWrap(wrap: string, placeholder = "text") {
    const el = editorRef.current
    if (!el) { setContent(c => c + wrap + placeholder + wrap); return }
    const s = el.selectionStart, e = el.selectionEnd
    const sel = content.slice(s, e) || placeholder
    const next = content.slice(0, s) + wrap + sel + wrap + content.slice(e)
    setContent(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + wrap.length, s + wrap.length + sel.length) }, 0)
  }
  function insertAtCursor(txt: string) {
    const el = editorRef.current
    if (!el) { setContent(c => c + txt); return }
    const s = el.selectionStart, e = el.selectionEnd
    const next = content.slice(0, s) + txt + content.slice(e)
    setContent(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + txt.length, s + txt.length) }, 0)
  }
  async function copyUnicode() {
    await navigator.clipboard.writeText(unicode)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  async function doExport() {
    const ref = tab === "card" ? cardRef : feedRef
    if (!ref?.current) { alert("Nothing to export on this tab."); return }
    setExporting(true)
    try {
      const dataUrl = await toPng(ref.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: tab === "card" ? undefined : "#ffffff",
      })
      const a = document.createElement("a"); a.download = "linkedin-post.png"; a.href = dataUrl; a.click()
    } catch (e: any) {
      console.error("Export failed:", e)
      alert("Export failed: " + e.message)
    } finally {
      setExporting(false)
    }
  }
  async function callCardAi(action: "generateThought" | "generateTitleHeader") {
    if (!apiKey) { setSettingsOpen(true); return }
    if (!content.trim()) return
    setAiLoading(action)
    try {
      const result = await callGemini(action, content, apiKey)
      if (action === "generateThought") setThought(result)
      else if (action === "generateTitleHeader") {
        const parts = result.split("|").map(s => s.trim())
        if (parts[0]) setCardTitle(parts[0])
        if (parts[1]) setCardHeader(parts[1])
      }
    } catch (e: any) { alert(e.message || "AI failed") }
    finally { setAiLoading(null) }
  }

  /* ── Layout helpers ──────────────────────── */
  const deviceWidths = { mobile: "max-w-[390px]", tablet: "max-w-[520px]", desktop: "max-w-[560px]" }
  const tabs = [
    { id: "preview" as const, label: "Feed Preview", sub: "See how it looks in feed" },
    { id: "card" as const, label: "Image Card", sub: "17 themes · Export PNG" },
  ]

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-gray-50 dark:bg-[#111113] text-gray-900 dark:text-zinc-100 transition-colors duration-200">

        {/* ══════ Header ══════ */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#111113]/90 backdrop-blur border-b border-gray-200 dark:border-zinc-800">
          <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0A66C2] grid place-items-center text-white font-bold text-sm shrink-0">in</div>
              <div className="hidden sm:block">
                <div className="font-bold text-sm leading-tight">Content Crafter</div>
                <div className="text-[11px] text-gray-400 dark:text-zinc-500 leading-tight">LinkedIn Post Studio</div>
              </div>

            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSettingsOpen(true)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${apiKey
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                }`}>
                {apiKey ? "✓ AI Ready" : "⚙ Enable AI"}
              </button>
              <button onClick={() => setDark(!dark)}
                className="w-8 h-8 grid place-items-center rounded-full border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-sm">
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="max-w-[1280px] mx-auto px-4 flex gap-2 pb-3">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`text-left px-4 py-2.5 rounded-xl border flex-1 min-w-[120px] transition-all ${tab === t.id
                  ? "bg-[#0A66C2] text-white border-[#0A66C2] shadow-md"
                  : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-600 dark:text-zinc-400"
                }`}>
                <div className="text-[13px] font-semibold leading-tight">{t.label}</div>
                <div className={`text-[11px] leading-tight mt-0.5 ${tab === t.id ? "text-white/70" : "text-gray-400 dark:text-zinc-500"}`}>{t.sub}</div>
              </button>
            ))}
          </div>
        </header>

        {/* ══════ Main ══════ */}
        <main className={`max-w-[1280px] mx-auto px-4 py-6 grid gap-6 ${tab === "card" ? "grid-cols-1 lg:grid-cols-[340px_340px_1fr]" : "grid-cols-1 lg:grid-cols-[380px_1fr]"}`}>

          {/* ── Left: Editor ── */}
          <div className="space-y-4 lg:sticky lg:top-[140px] h-fit">
            {/* Editor card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
              {/* Editor header */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800">
                <span className="font-semibold text-sm text-gray-800 dark:text-zinc-200">Editor</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${content.length > 3000 ? "bg-red-500" : pastFold ? "bg-amber-500" : "bg-emerald-500"}`} />
                  <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums">{content.length} / 3000</span>
                </div>
              </div>

              {/* AI Bar */}
              <AiBar text={content} onResult={setContent} />

              {/* Formatting toolbar */}
              <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                {([
                  ["𝐁 Bold", "**", "wrap"],
                  ["𝐼 Italic", "*", "wrap"],
                  ["S̶ Strike", "~~", "wrap"],
                  ["• Bullet", "• ", "insert"],
                  ["→ Arrow", " → ", "insert"],
                  ["# Tag", " #", "insert"],
                ] as const).map(([label, text, type]) => (
                  <button key={label}
                    onClick={() => type === "wrap" ? insertWrap(text) : insertAtCursor(text)}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"
                    title={type === "wrap" ? `Wrap with ${text}` : "Insert at cursor"}>
                    {label}
                  </button>
                ))}
                <div className="w-px bg-gray-200 dark:bg-zinc-700 mx-1 self-stretch" />
                {["😊", "👉", "✨"].map(e => (
                  <button key={e} onClick={() => insertAtCursor(` ${e} `)}
                    className="px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition">
                    {e}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={editorRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your LinkedIn post…"
                className="w-full min-h-[240px] p-4 text-[14px] leading-6 outline-none resize-y bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
              />

              {/* Stats */}
              <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-500 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                <span>{stats.words} words</span>
                <span>·</span>
                <span>{stats.lines} lines</span>
                <span>·</span>
                <span className={pastFold ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>
                  {Math.min(content.length, FOLD)}/{FOLD} hook
                </span>
                <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={showFold} onChange={e => setShowFold(e.target.checked)} className="accent-[#0A66C2] w-3.5 h-3.5" />
                  <span>Show fold line</span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="p-3 grid grid-cols-2 gap-2">
                <button onClick={copyUnicode}
                  className="py-2.5 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] active:scale-[0.98] transition">
                  {copied ? "✓ Copied!" : "Copy for LinkedIn"}
                </button>
                <button onClick={doExport} disabled={!canExport(tab) || exporting}
                  className="py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed">
                  {exporting ? "Exporting…" : "Export PNG"}
                </button>
              </div>
            </div>

            {/* Profile card — only on preview tab */}
            {tab === "preview" && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm p-4">
                <div className="font-semibold text-sm text-gray-800 dark:text-zinc-200 mb-3">Profile</div>
                <div className="grid gap-2.5">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} />
                  <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Your headline" className={inputCls} />
                  <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Avatar URL" className={inputCls} />
                  <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn profile URL" className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* ── Middle: Card Styling (card tab only) ── */}
          {tab === "card" && (
            <div className="space-y-4 lg:sticky lg:top-[140px] h-fit">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100 dark:border-zinc-800">
                  {(["edit", "style"] as const).map(st => (
                    <button key={st} onClick={() => setCardSubTab(st)}
                      className={`flex-1 py-2.5 text-xs font-semibold transition ${cardSubTab === st
                        ? "text-[#0A66C2] border-b-2 border-[#0A66C2]"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
                      }`}>
                      {st === "edit" ? "✏️ Edit" : "🎨 Style"}
                    </button>
                  ))}
                </div>
                <div className="p-4">
                  {cardSubTab === "edit" && (
                    <div className="grid gap-2.5">
                      <input value={cardHeader} onChange={e => setCardHeader(e.target.value)} placeholder="Series header (e.g. AI-Byte #24)" className={inputCls} />
                      <input value={cardTitle} onChange={e => setCardTitle(e.target.value)} placeholder="Card title" className={inputCls} />
                      <input value={thought} onChange={e => setThought(e.target.value)} placeholder="Highlighted thought (optional)" className={inputCls} />
                      <div className="flex gap-2 pt-1">
                        <button disabled={!!aiLoading} onClick={() => callCardAi("generateThought")}
                          className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
                          {aiLoading === "generateThought" ? "…" : "✨ Generate Thought"}
                        </button>
                        <button disabled={!!aiLoading} onClick={() => callCardAi("generateTitleHeader")}
                          className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
                          {aiLoading === "generateTitleHeader" ? "…" : "🤖 Auto Title"}
                        </button>
                      </div>
                    </div>
                  )}
                  {cardSubTab === "style" && (
                    <div className="grid gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500 dark:text-zinc-400">Width</span>
                          <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums">{cardWidth}px</span>
                        </div>
                        <input type="range" min="300" max="700" value={cardWidth} onChange={e => setCardWidth(Number(e.target.value))} className="w-full" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500 dark:text-zinc-400">Text color</span>
                          <button onClick={() => setTextColor(gradient.text)} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition">reset</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-zinc-700 cursor-pointer bg-transparent p-0.5" />
                          <span className="text-xs text-gray-400 dark:text-zinc-500 font-mono">{textColor}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Theme</div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {GRADIENTS.map(g => (
                            <button key={g.id} onClick={() => { setGradient(g); setTextColor(g.text) }}
                              className={`relative w-full aspect-square rounded-lg border-2 transition-all duration-150 hover:scale-110 ${gradient.id === g.id
                                ? "border-gray-900 dark:border-white shadow-lg scale-110 ring-2 ring-[#0A66C2]"
                                : "border-transparent hover:border-gray-300 dark:hover:border-zinc-600"
                              }`}
                              style={{ background: g.bg }} title={g.id}>
                              {gradient.id === g.id && <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">✓</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Right: Tab Content ── */}
          <div className="space-y-4">

            {/* ═══ Feed Preview Tab ═══ */}
            {tab === "preview" && (
              <>
                {/* Device toggle + controls */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-1 shadow-sm">
                    {(["mobile", "tablet", "desktop"] as const).map(d => (
                      <button key={d} onClick={() => setDevice(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${device === d
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow"
                          : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
                        }`}>
                        {d === "mobile" ? "📱" : d === "tablet" ? "📋" : "🖥️"} {d.charAt(0).toUpperCase() + d.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-500 dark:text-zinc-400">
                      <input type="checkbox" checked={showFold} onChange={e => setShowFold(e.target.checked)} className="accent-[#0A66C2] w-3.5 h-3.5" />
                      fold
                    </label>
                    <button onClick={() => setExpanded(!expanded)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800 transition">
                      {expanded ? "Collapse" : "See more"}
                    </button>
                  </div>
                </div>

                {/* Feed card */}
                <div className={`mx-auto transition-all ${deviceWidths[device]}`}>
                  <div ref={feedRef} className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
                    {/* Post header */}
                    <div className="p-3 flex gap-3">
                      <img src={resolvedAvatar || avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-[14px] leading-tight text-gray-900 dark:text-zinc-100 truncate">{name || "Your Name"}</div>
                            <div className="text-[12px] text-gray-500 dark:text-zinc-400 leading-tight line-clamp-1">{headline || "Your headline"}</div>
                            <div className="text-[12px] text-gray-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">now · 🌐</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a href={linkedinUrl} target="_blank" className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950 transition">+ Follow</a>
                            <button className="w-8 h-8 grid place-items-center text-gray-400 dark:text-zinc-500 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition">⋯</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Post body */}
                    <div className="px-3 pb-3 text-[14px] leading-[1.45] break-words text-gray-900 dark:text-zinc-100">
                      {showFold && !expanded && pastFold ? (
                        <>
                          <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: markdownToHtml(beforeFold) }} />
                          <span className="bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-400">{content.slice(Math.max(0, FOLD - 18), FOLD)}</span>
                          <span className="text-gray-400 dark:text-zinc-500">…</span>
                          <button onClick={() => setExpanded(true)} className="ml-1 text-gray-500 dark:text-zinc-400 hover:underline text-[14px]">...see more</button>
                          <div className="mt-2 text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">✂️ Cutoff at {FOLD} chars — hook must land before here</div>
                        </>
                      ) : (
                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: markdownToHtml(content || "Your post will appear here…") }} />
                      )}
                      {expanded && pastFold && (
                        <button onClick={() => setExpanded(false)} className="ml-2 text-gray-500 dark:text-zinc-400 hover:underline text-[14px]">Show less</button>
                      )}
                    </div>

                    {/* Reactions */}
                    <div className="px-3 pb-2 flex items-center justify-between text-[12px] text-gray-500 dark:text-zinc-400 border-t border-gray-100 dark:border-zinc-800 pt-2">
                      <div className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-[#0A66C2] grid place-items-center text-white text-[10px]">👍</span>
                        <span className="w-5 h-5 rounded-full bg-red-500 grid place-items-center text-white text-[10px] -ml-1">❤️</span>
                        <span className="ml-1">248</span>
                      </div>
                      <div>12 comments · 4 reposts</div>
                    </div>

                    {/* Action bar */}
                    <div className="grid grid-cols-4 border-t border-gray-100 dark:border-zinc-800 text-sm">
                      {["👍 Like", "💬 Comment", "↗ Repost", "✉ Send"].map(lab => (
                        <button key={lab} className="py-2.5 flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-medium text-xs transition">
                          {lab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fold indicator */}
                  {pastFold && (
                    <div className="mt-3 text-center text-xs text-gray-400 dark:text-zinc-500">
                      Truncates at ~210 chars · {content.length - FOLD} hidden
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ═══ Image Card Tab ═══ */}
            {tab === "card" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Preview</div>
                  <button onClick={doExport} disabled={exporting}
                    className="text-xs font-semibold px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-40">
                    {exporting ? "Exporting…" : "⬇ Download PNG"}
                  </button>
                </div>
                <div className="flex justify-center">
                  <div ref={cardRef} className="w-full rounded-[12px] overflow-hidden shadow-2xl" style={{ background: gradient.bg, maxWidth: `${cardWidth}px` }}>
                    {/* macOS header */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span className="text-sm font-medium ml-2" style={{ color: textColor }}>{cardHeader}</span>
                      </div>
                      <div className="p-1.5 rounded-md" style={{ background: "rgba(128,128,128,0.3)" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8">
                      <div className="text-[28px] md:text-[32px] font-bold leading-tight" style={{ color: textColor, fontFamily: "'Source Serif 4', serif" }}>{cardTitle}</div>
                      <div className="mt-4 whitespace-pre-wrap text-[14px] leading-6" style={{ color: textColor, opacity: 0.95 }} dangerouslySetInnerHTML={{ __html: cardHtml }} />
                      {thought && (
                        <div className="mt-4 text-sm leading-6 p-4 rounded-lg" style={{
                          background: "rgba(255,255,255,0.05)",
                          borderLeft: "4px solid rgba(255,255,255,0.2)",
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                          fontStyle: "italic",
                          color: textColor,
                        }} dangerouslySetInnerHTML={{ __html: `&ldquo;${thoughtHtml}&rdquo;` }} />
                      )}
                    </div>

                    {/* Glass footer */}
                    <div className="px-6 py-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <div className="flex items-center gap-3">
                        <img src={resolvedAvatar || avatar} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: `2px solid ${textColor}` }} />
                        <div>
                          <div className="font-semibold text-sm leading-none" style={{ color: textColor }}>{name}</div>
                          <div className="text-xs mt-1" style={{ color: textColor, opacity: 0.8 }}>{headline}</div>
                        </div>
                      </div>
                      <a href={linkedinUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-[#0077B5] text-white hover:bg-[#005582] transition">
                        Follow me
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      </a>
                    </div>
                  </div>
                </div>


              </div>
            )}

          </div>
        </main>

        {/* ══════ Footer ══════ */}
        <footer className="max-w-[1280px] mx-auto px-4 pb-8 text-center text-xs text-gray-400 dark:text-zinc-500">
          <div className="border-t border-gray-200 dark:border-zinc-800 pt-6">
            <a href={linkedinUrl} target="_blank" className="underline hover:text-gray-600 dark:hover:text-zinc-300 transition">satya-dileep</a> · MIT · Open Source
          </div>
        </footer>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  )
}

function canExport(tab: string) {
  return tab === "preview" || tab === "card"
}
