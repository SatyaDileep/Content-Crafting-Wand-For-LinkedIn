import { useRef, useState, useMemo, useEffect } from "react"
import { toPng } from "html-to-image"
import { markdownToUnicode, markdownToHtml } from "./lib/unicode"
import { callAI } from "./lib/gemini"
import { useAuth } from "./lib/auth"
import AiBar from "./components/AiBar"
import SettingsModal from "./components/SettingsModal"
import Carousel from "./components/Carousel"

/* ── Constants ─────────────────────────────────────── */
const FOLD = 210
const FALLBACK_AVATAR = "data:image/svg+xml;utf8," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='#cbd5e1'/><circle cx='50' cy='40' r='18' fill='#94a3b8'/><path d='M22 88 Q50 60 78 88' stroke='#94a3b8' stroke-width='12' fill='none' stroke-linecap='round'/></svg>"
)
const DEFAULT_POST = `Your catchy title here — make it **bold** and irresistible.
This is your hook: 3 lines before LinkedIn shows "…see more". Make it count.
**One sharp insight** your audience will remember.
• Takeaway one
• Takeaway two
• Takeaway three
What's your take? 👇
#LinkedInTips #ContentCreation`

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
  const [dark, setDark] = useState(false)
  return [dark, setDark] as const
}

/* ── Shared input class ────────────────────────────── */
const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-gray-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-zinc-500"

/* ── Main ──────────────────────────────────────────── */
export default function App() {
  const { aiProvider, aiKey, aiModel, aiBase } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<"preview" | "card" | "carousel">("preview")
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
      } catch { setAvatarDataUrl(FALLBACK_AVATAR) }
    }
    img.onerror = () => setAvatarDataUrl(FALLBACK_AVATAR)
    img.src = avatar
  }, [avatar])
  const resolvedAvatar = avatarDataUrl || FALLBACK_AVATAR

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
  const [cardTab, setCardTab] = useState<"compose" | "style">("compose")

  const editorRef = useRef<HTMLTextAreaElement>(null)
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
    if (!cardRef.current) { alert("Nothing to export on this tab."); return }
    setExporting(true)
    const opts = { cacheBust: true, pixelRatio: 2, backgroundColor: undefined }
    try {
      const dataUrl = await toPng(cardRef.current, opts)
      const a = document.createElement("a"); a.download = "linkedin-post.png"; a.href = dataUrl; a.click()
    } catch (e: any) {
      // Google Fonts embedding can occasionally fail; retry without font inlining.
      try {
        const dataUrl = await toPng(cardRef.current, { ...opts, skipFonts: true })
        const a = document.createElement("a"); a.download = "linkedin-post.png"; a.href = dataUrl; a.click()
        return
      } catch { /* fall through to error */ }
      console.error("Export failed:", e)
      alert("Export failed: " + (e?.message || e || "unknown error"))
    } finally {
      setExporting(false)
    }
  }
  async function callCardAi(action: "generateThought" | "generateTitleHeader") {
    if (!aiKey) { setSettingsOpen(true); return }
    if (!content.trim()) return
    setAiLoading(action)
    try {
      const { text: result } = await callAI(action, content, { provider: aiProvider, apiKey: aiKey, model: aiModel, baseUrl: aiBase })
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
  const tabs = [
    { id: "preview" as const, label: "Post Preview", sub: "See it in the real feed", icon: "🔍" },
    { id: "card" as const, label: "Image Card", sub: "Visual post · Export PNG", icon: "🎨" },
    { id: "carousel" as const, label: "Document", sub: "Preview PDF + post", icon: "📄" },
  ]

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen isolate bg-[#f6f7fb] dark:bg-[#0e0f12] text-gray-900 dark:text-zinc-100 transition-colors duration-200 relative overflow-x-clip">
        {/* Ambient color blobs (glass glow) */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#0A66C2]/15 blur-3xl" />
          <div className="absolute top-1/4 -right-40 w-[560px] h-[560px] rounded-full bg-violet-400/15 blur-3xl" />
          <div className="absolute bottom-[-160px] left-1/3 w-[520px] h-[520px] rounded-full bg-teal-300/20 blur-3xl" />
        </div>

        {/* ══════ Header ══════ */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#111113]/70 backdrop-blur-xl border-b border-white/70 dark:border-zinc-800 shadow-[0_1px_20px_rgba(15,23,42,0.04)]">
          <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A66C2] to-indigo-500 grid place-items-center text-white font-bold text-sm shrink-0 shadow-[0_2px_12px_rgba(10,102,194,0.4)]">in</div>
              <div className="hidden sm:block">
                <div className="font-bold text-sm leading-tight bg-gradient-to-r from-[#0A66C2] to-indigo-600 bg-clip-text text-transparent">Content Crafter</div>
                <div className="text-[11px] text-gray-400 dark:text-zinc-500 leading-tight">LinkedIn Post Studio · 100% private</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSettingsOpen(true)}
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition active:scale-95 ${aiKey
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300/50 dark:ring-emerald-700/40 hover:border-emerald-300 dark:hover:border-emerald-700"
                  : "bg-[#0A66C2] border-[#0A66C2] text-white shadow-[0_1px_6px_rgba(10,102,194,0.35)] hover:bg-[#004182] hover:border-[#004182]"
                }`}>
                {aiKey ? "✓ AI Ready" : "⚙ Enable AI"}
              </button>
              <button onClick={() => setDark(!dark)}
                className="w-8 h-8 grid place-items-center rounded-full border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-sm">
                {dark ? "☀️" : "🌙"}
              </button>
            </div>
          </div>

          {/* Mode switcher */}
          <div className="max-w-[1280px] mx-auto px-4 pb-3 pt-2">
            <div className="flex gap-1.5 p-1 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-sm">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`text-left px-4 py-2 rounded-xl flex-1 min-w-[120px] transition-all active:scale-[0.98] border ${tab === t.id
                    ? "bg-gradient-to-br from-[#0A66C2] to-indigo-600 text-white border-transparent shadow-[0_2px_10px_rgba(10,102,194,0.35)]"
                    : "bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 border-gray-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 hover:border-gray-300"
                  }`}>
                  <div className="text-[13px] font-semibold leading-tight flex items-center gap-1.5">
                    <span>{t.icon}</span>{t.label}
                  </div>
                  <div className={`text-[11px] leading-tight mt-0.5 ${tab === t.id ? "text-white/75" : "text-gray-400 dark:text-zinc-500"}`}>{t.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ══════ Main ══════ */}
        <main className="max-w-[1280px] mx-auto px-4 py-6 grid gap-6 grid-cols-1 lg:grid-cols-[380px_1fr]">

          {/* ── Left: Editor / Card Composer ── */}
          <div className="space-y-4 lg:sticky lg:top-[140px] h-fit">
            {tab === "card" ? (
              <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-800 shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-gray-200/60 dark:border-zinc-800">
                  <div className="text-sm font-bold text-gray-800 dark:text-zinc-200">Image Card</div>
                  <div className="text-[11px] text-gray-400 dark:text-zinc-500">One place to compose & style — then export</div>
                  <div className="mt-3 flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200/60 dark:border-zinc-700">
                    {(["compose", "style"] as const).map(id => (
                      <button key={id} onClick={() => setCardTab(id)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${cardTab === id ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-600" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"}`}>
                        {id === "compose" ? "✎ Compose" : "🎨 Style"}
                      </button>
                    ))}
                  </div>
                </div>
                {cardTab === "compose" ? (
                  <div className="space-y-0">
                    <div className="p-4 space-y-2.5">
                      <input value={cardHeader} onChange={e => setCardHeader(e.target.value)} placeholder="Eyebrow — e.g. AI-Byte #24" className={inputCls} />
                      <input value={cardTitle} onChange={e => setCardTitle(e.target.value)} placeholder="Card title — the big line" className={inputCls} />
                      <input value={thought} onChange={e => setThought(e.target.value)} placeholder="Pull quote (optional)" className={inputCls} />
                      <div className="flex gap-2">
                        <button disabled={!!aiLoading} onClick={() => callCardAi("generateThought")}
                          className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
                          {aiLoading === "generateThought" ? "…" : "✨ Thought"}
                        </button>
                        <button disabled={!!aiLoading} onClick={() => callCardAi("generateTitleHeader")}
                          className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
                          {aiLoading === "generateTitleHeader" ? "…" : "🤖 Title"}
                        </button>
                      </div>
                    </div>
                    <div className="border-y border-gray-200/60 dark:border-zinc-800">
                      <AiBar text={content} onResult={setContent} />
                      <div className="px-3 py-2 flex flex-wrap gap-1 border-y border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
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
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition">
                            {label}
                          </button>
                        ))}
                        <div className="w-px bg-gray-200 dark:bg-zinc-700 mx-1 self-stretch" />
                        {["😊", "👉", "✨"].map(e => (
                          <button key={e} onClick={() => insertAtCursor(` ${e} `)} className="px-2 py-1.5 text-xs rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition">{e}</button>
                        ))}
                      </div>
                      <textarea ref={editorRef} value={content} onChange={e => setContent(e.target.value)} placeholder="Card body — also your LinkedIn caption…" className="w-full min-h-[180px] p-4 text-[14px] leading-6 outline-none resize-y bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500" />
                      <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-500 border-t border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
                        <span>{stats.words} words</span><span>·</span><span>{stats.lines} lines</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
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
                            className={`group relative w-full aspect-square rounded-xl border-2 transition-all duration-150 ${gradient.id === g.id ? "border-gray-900 dark:border-white ring-2 ring-[#0A66C2] ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : "border-transparent hover:border-gray-300 dark:hover:border-zinc-600 hover:scale-110"}`}
                            style={{ background: g.bg }}>
                            <span className="absolute inset-x-1 bottom-1 text-center text-[8px] font-semibold uppercase tracking-wide text-white opacity-0 group-hover:opacity-90 transition pointer-events-none truncate leading-[10px]" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{g.id.replace(/-/g, " ")}</span>
                            {gradient.id === g.id && (<span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/95 grid place-items-center text-black text-[10px] font-bold shadow pointer-events-none">✓</span>)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="p-3 grid gap-2 border-t border-gray-200/60 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40">
                  <button onClick={doExport} disabled={exporting} className="w-full py-3 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition shadow-sm bg-gradient-to-r from-[#0A66C2] to-indigo-600 hover:opacity-90 disabled:opacity-40 shadow-[0_2px_10px_rgba(10,102,194,0.35)]">
                    {exporting ? "Exporting…" : "⬇ Download PNG"}
                  </button>
                  <button onClick={copyUnicode} className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition active:scale-[0.98] ${copied ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"}`}>
                    {copied ? "✓ Caption copied" : "Copy caption for LinkedIn"}
                  </button>
                  <p className="text-center text-[11px] text-gray-400 dark:text-zinc-500">Download the image, paste caption as your post text.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-800 shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200/60 dark:border-zinc-800">
                    <span className="font-semibold text-sm text-gray-800 dark:text-zinc-200">Editor</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${content.length > 3000 ? "bg-red-500" : pastFold ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums">{content.length} / 3000</span>
                    </div>
                  </div>
                  <AiBar text={content} onResult={setContent} />
                  <div className="px-3 py-2 flex flex-wrap gap-1 border-b border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
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
                  <textarea ref={editorRef} value={content} onChange={e => setContent(e.target.value)} placeholder="Write your LinkedIn post…" className="w-full min-h-[240px] p-4 text-[14px] leading-6 outline-none resize-y bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500" />
                  <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-gray-400 dark:text-zinc-500 border-t border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
                    <span>{stats.words} words</span><span>·</span><span>{stats.lines} lines</span><span>·</span>
                    <span className={pastFold ? "text-amber-600 dark:text-amber-400 font-medium" : ""}>{Math.min(content.length, FOLD)}/{FOLD} hook</span>
                    <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={showFold} onChange={e => setShowFold(e.target.checked)} className="accent-[#0A66C2] w-3.5 h-3.5" /><span>Show fold line</span>
                    </label>
                  </div>
                  <div className="p-3">
                    <button onClick={copyUnicode} className={`w-full py-3 rounded-xl text-white text-sm font-semibold active:scale-[0.98] transition-colors shadow-sm ${copied ? "bg-emerald-600" : "bg-[#0A66C2] hover:bg-[#004182] shadow-[0_1px_6px_rgba(10,102,194,0.35)]"}`}>
                      {copied ? "✓ Copied to clipboard" : "Copy for LinkedIn"}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-zinc-500">Bold, italic & bullets become LinkedIn-safe Unicode — paste and post.</p>
                  </div>
                </div>
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
              </>
            )}
          </div>

          {/* ── Right: Tab Content ── */}
          <div className="space-y-4">

            {/* ═══ Feed Preview Tab ═══ */}
            {tab === "preview" && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
                    <div>
                      <div className="text-sm font-bold text-gray-800 dark:text-zinc-200">Feed Preview — how LinkedIn will show it</div>
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500">Realistic rendering · format keeps as Unicode</div>
                    </div>
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
                <div className="mx-auto max-w-[560px] transition-all">
                  <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
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
                          <div className="mt-2 text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">🔒 {FOLD}-char hook — keep the good stuff above the fold</div>
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
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                  <div>
                    <div className="text-sm font-bold text-gray-800 dark:text-zinc-200">Image Card — your export canvas</div>
                    <div className="text-[11px] text-gray-400 dark:text-zinc-500">Preview updates live as you compose on the left</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/70 dark:border-zinc-800 bg-[radial-gradient(circle,rgba(120,130,150,0.25)_1px,transparent_1px)] bg-[size:18px_18px] p-6 flex justify-center">
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
                      <div className="mt-3 text-[14px] leading-5 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_br]:block [&_br]:h-1" style={{ color: textColor, opacity: 0.95 }} dangerouslySetInnerHTML={{ __html: cardHtml }} />
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

            {/* ═══ Document Tab — caption + PDF together, like LinkedIn ═══ */}
            {tab === "carousel" && (
              <Carousel
                content={content}
                name={name}
                headline={headline}
                avatar={resolvedAvatar}
                linkedinUrl={linkedinUrl}
              />
            )}
          </div>
        </main>

        {/* ══════ Footer ══════ */}
        <footer className="max-w-[1280px] mx-auto px-4 pb-10 text-center text-xs text-gray-400 dark:text-zinc-500">
          <div className="border-t border-white/70 dark:border-zinc-800 pt-6 flex flex-col items-center gap-2.5">
            <div className="flex items-center gap-2 font-semibold text-gray-600 dark:text-zinc-300">
              <span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#0A66C2] to-indigo-500 grid place-items-center text-white text-[10px] font-bold shadow-[0_2px_8px_rgba(10,102,194,0.35)]">in</span>
              Content Crafter
            </div>
            <div className="max-w-[520px] leading-5">
              Build in public by <a href={linkedinUrl} target="_blank" className="underline hover:text-gray-600 dark:hover:text-zinc-300 transition">Satya Dileep</a> · MIT · Open Source<br />
              No servers, no tracking, no account — your content never leaves your browser.
            </div>
          </div>
        </footer>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
    </div>
  )
}
