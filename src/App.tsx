import { useRef, useState, useMemo, useEffect } from "react"
import { toPng } from "html-to-image"
import { markdownToUnicode, markdownToHtml, unicodeRatio } from "./lib/unicode"
import { callAI, PROVIDER_LABELS } from "./lib/gemini"
import { useAuth } from "./lib/auth"
import { track } from "./lib/telemetry"
import { shareOnLinkedIn, postViaApi, beginLinkedInLogin, LINKEDIN_CLIENT_ID } from "./lib/linkedin"
import { getFold, FOLD_CONFIGS } from "./lib/fold"
import { getMetadata } from "./lib/metadata"
import { loadDrafts, saveDrafts, upsertDraft } from "./lib/drafts"
import { encodeShare, decodeShare, getHashPayload } from "./lib/serializer"
import AiBar from "./components/AiBar"
import SettingsModal from "./components/SettingsModal"
import Carousel from "./components/Carousel"
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
  { id: "corporate-navy", bg: "linear-gradient(135deg, #0F172A, #1E3A5F)", text: "#f8fafc" },
  { id: "corporate-slate", bg: "linear-gradient(135deg, #1E293B, #334155)", text: "#f1f5f9" },
  { id: "corporate-white", bg: "#ffffff", text: "#0F172A" },
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
    try {
      const s = localStorage.getItem("cc_theme")
      if (s) return s === "dark"
      return window.matchMedia("(prefers-color-scheme: dark)").matches
    } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem("cc_theme", dark ? "dark" : "light") } catch {}
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])
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
  const [expanded, setExpanded] = useState(false)
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop")

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

  const [linkedIn, setLinkedIn] = useState(() => typeof localStorage !== "undefined" && !!localStorage.getItem("cc_linkedin_token"))
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const code = params.get("code")
    if (code) {
      track("linkedin_oauth_callback", {})
      fetch(`/api/linkedin/token?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(location.origin + "/auth/linkedin/callback")}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d?.access_token) { localStorage.setItem("cc_linkedin_token", d.access_token); setLinkedIn(true) }
          else { localStorage.setItem("cc_linkedin_token", "code:" + code); setLinkedIn(true) }
        })
        .catch(() => { localStorage.setItem("cc_linkedin_token", "code:" + code); setLinkedIn(true) })
        .finally(() => history.replaceState({}, "", location.pathname))
    }
  }, [])
  useEffect(() => {
    const h = getHashPayload()
    if (h) { const d = decodeShare(h); if (d?.content) setContent(d.content); if (d?.cardTitle) setCardTitle(d.cardTitle) }
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem("cc_current_content", content); setLastSaved(Date.now()) } catch {} }, 500)
    return () => clearTimeout(t)
  }, [content])
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (content !== DEFAULT_POST && content.trim()) { e.preventDefault(); e.returnValue = "" } }
    window.addEventListener("beforeunload", before)
    return () => window.removeEventListener("beforeunload", before)
  }, [content])
  useEffect(() => {
    const onSel = () => {
      const el = editorRef.current
      if (!el) { setBubble(null); return }
      const s = el.selectionStart, e = el.selectionEnd
      if (s === e || document.activeElement !== el) { setBubble(null); return }
      const rect = el.getBoundingClientRect()
      const txt = content.slice(s, e)
      if (!txt.trim()) { setBubble(null); return }
      setBubble({ x: rect.left + rect.width / 2, y: rect.top - 8, text: txt })
    }
    document.addEventListener("mouseup", onSel)
    document.addEventListener("keyup", onSel)
    return () => { document.removeEventListener("mouseup", onSel); document.removeEventListener("keyup", onSel) }
  }, [content])

  /* Card state */
  const [gradient, setGradient] = useState(GRADIENTS[0])
  const [cardHeader, setCardHeader] = useState("AI-Byte Series #Day24")
  const [cardTitle, setCardTitle] = useState("Your catchy title here")
  const [thought, setThought] = useState("")
  const [cardWidth, setCardWidth] = useState(500)
  const [textColor, setTextColor] = useState("#f0f0f0")
  const [cardPreset, setCardPreset] = useState<"free" | "1:1" | "4:5">("free")
  const [safeZone, setSafeZone] = useState(false)
  const [showAttribution, setShowAttribution] = useState(true)

  /* UI state */
  const [copied, setCopied] = useState(false)
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const [globalAi, setGlobalAi] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [cardTab, setCardTab] = useState<"compose" | "style">("compose")
  const [editorTab, setEditorTab] = useState<"write" | "profile">("write")

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [drafts, setDrafts] = useState(() => { try { return loadDrafts() } catch { return [] } })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [bubble, setBubble] = useState<{ x: number; y: number; text: string } | null>(null)
  const [lastSaved, setLastSaved] = useState<number | null>(null)

  /* Derived */
  const unicode = useMemo(() => markdownToUnicode(content), [content])
  const cardHtml = useMemo(() => markdownToHtml(content), [content])
  const thoughtHtml = useMemo(() => markdownToHtml(thought), [thought])
  const stats = useMemo(() => getMetadata(content), [content])
  const fold = useMemo(() => getFold(content, viewport), [content, viewport])
  const beforeFold = fold.visible
  const pastFold = fold.isFolded

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
    if (["😊", "👉", "✨"].some(e => txt.includes(e)) || txt.trim() === "•" || txt.includes("→") || txt.includes("#")) track("emoji_click", { emoji: txt.trim().slice(0, 4) })
    const el = editorRef.current
    if (!el) { setContent(c => c + txt); return }
    const s = el.selectionStart, e = el.selectionEnd
    const next = content.slice(0, s) + txt + content.slice(e)
    setContent(next)
    setTimeout(() => { el.focus(); el.setSelectionRange(s + txt.length, s + txt.length) }, 0)
  }
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.metaKey || e.ctrlKey
    if (!mod) return
    if (e.key.toLowerCase() === "b" && !e.shiftKey) { e.preventDefault(); insertWrap("**") }
    else if (e.key.toLowerCase() === "i" && !e.shiftKey) { e.preventDefault(); insertWrap("*") }
    else if (e.key.toLowerCase() === "u") { e.preventDefault(); insertWrap("__") }
  }
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const txt = e.clipboardData.getData("text")
    if (/\*\*|__|\*|~~|`/.test(txt)) {
      // let default paste keep markdown; preview converts to unicode via copy
    }
  }
  async function copyUnicode(source: "preview" | "caption" = "preview") {
    try { await navigator.clipboard.writeText(unicode) } catch {
      const ta = document.createElement("textarea"); ta.value = unicode; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove()
    }
    track(source === "caption" ? "copy_caption" : "copy_preview", { len: unicode.length })
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  async function shareToLinkedIn() {
    track("linkedin_share_click", { len: unicode.length, has_token: !!localStorage.getItem("cc_linkedin_token") })
    const ok = await postViaApi(unicode)
    if (ok) { track("linkedin_post_api_success", {}); return }
    if (LINKEDIN_CLIENT_ID && !localStorage.getItem("cc_linkedin_token")) {
      beginLinkedInLogin()
      return
    }
    shareOnLinkedIn(unicode)
    track("linkedin_share_intent", {})
  }
  async function doExport() {
    if (!cardRef.current) { alert("Nothing to export on this tab."); return }
    track("export_png_click", { width: cardWidth, gradient: gradient.id })
    setExporting(true)
    try { await (document as any).fonts?.ready } catch {}
    const opts: any = { cacheBust: true, pixelRatio: 2, backgroundColor: undefined }
    try {
      const dataUrl = await toPng(cardRef.current, opts)
      const a = document.createElement("a"); a.download = "linkedin-post.png"; a.href = dataUrl; a.click()
      track("export_png_success", { width: cardWidth })
    } catch (e: any) {
      try {
        const dataUrl = await toPng(cardRef.current, { ...opts, skipFonts: true })
        const a = document.createElement("a"); a.download = "linkedin-post.png"; a.href = dataUrl; a.click()
        track("export_png_success", { width: cardWidth, fallback: true })
        return
      } catch { /* fall through to error */ }
      track("export_png_error", {})
      console.error("Export failed:", e)
      alert("Export failed: " + (e?.message || e || "unknown error"))
    } finally {
      setExporting(false)
    }
  }
  async function callCardAi(action: "generateThought" | "generateTitleHeader") {
    if (!aiKey) { setSettingsOpen(true); return }
    if (!content.trim()) return
    track("ai_click", { action, provider: aiProvider, source: "card" })
    setAiLoading(action)
    setGlobalAi(action === "generateThought" ? "Crafting thought…" : "Crafting title…")
    try {
      const { text: raw } = await callAI(action, content, { provider: aiProvider, apiKey: aiKey, model: aiModel, baseUrl: aiBase })
      const result = raw.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/\n\n([•\-\*] )/g, "\n$1").trim()
      if (action === "generateThought") setThought(result.replace(/\n+/g, " ").trim())
      else if (action === "generateTitleHeader") {
        const parts = result.replace(/\n+/g, " ").split("|").map(s => s.trim())
        if (parts[0]) setCardTitle(parts[0])
        if (parts[1]) setCardHeader(parts[1])
      }
      track("ai_success", { action, provider: aiProvider })
    } catch (e: any) { track("ai_error", { action, provider: aiProvider }); alert(e.message || "AI failed") }
    finally { setAiLoading(null); setGlobalAi(null) }
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
          <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#0A66C2]/8 blur-3xl" />
          <div className="absolute top-1/4 -right-40 w-[560px] h-[560px] rounded-full bg-slate-400/6 blur-3xl" />
          <div className="absolute bottom-[-160px] left-1/3 w-[520px] h-[520px] rounded-full bg-zinc-300/6 blur-3xl" />
        </div>

        {/* ══════ Header ══════ */}
        <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#111113]/70 backdrop-blur-xl border-b border-[rgba(0,0,0,0.05)] dark:border-zinc-800 shadow-[0_1px_20px_rgba(15,23,42,0.04)]">
          <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0A66C2] to-indigo-500 grid place-items-center text-white font-bold text-sm shrink-0 shadow-[0_2px_12px_rgba(10,102,194,0.4)]">in</div>
              <div className="hidden sm:block">
                <div className="font-bold text-sm leading-tight bg-gradient-to-r from-[#0A66C2] to-indigo-600 bg-clip-text text-transparent">Content Crafter</div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 leading-tight">Private • No tracking • No signup</div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-center">
              {LINKEDIN_CLIENT_ID && (
                linkedIn ? (
                  <button onClick={() => { localStorage.removeItem("cc_linkedin_token"); setLinkedIn(false); track("linkedin_disconnect", {}) }} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#0A66C2] border border-[#0A66C2] text-white hover:bg-[#004182] transition h-8"> <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg> LinkedIn ✓</button>
                ) : (
                  <button onClick={() => { track("linkedin_connect_click", {}); beginLinkedInLogin() }} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#0A66C2] text-[#0A66C2] hover:bg-blue-50 transition h-8"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg> Connect LinkedIn</button>
                )
              )}
              <button onClick={() => { const nd = upsertDraft(drafts, content); setDrafts(nd) }} className="hidden sm:inline-flex items-center justify-center text-xs font-semibold px-3 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 h-8">Save draft</button>
              <button onClick={() => setDrawerOpen(v=>!v)} className="inline-flex items-center justify-center text-xs font-semibold px-3 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 h-8">Drafts ({drafts.length})</button>
              <button title="Copies a URL with your draft encoded in the hash — no backend, anyone with the link sees your draft prefilled (like linkedinpreview.com shareable URLs)" onClick={async () => { const url = location.origin + location.pathname + "#share=" + encodeShare(content, { cardTitle, cardHeader }); try { await navigator.clipboard.writeText(url) } catch { const ta=document.createElement("textarea"); ta.value=url; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove() } ; setShareCopied(true); setTimeout(()=>setShareCopied(false),1800) }} className="hidden sm:inline-flex items-center justify-center text-xs font-semibold px-3 rounded-full border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 h-8">{shareCopied ? "✓ Link copied" : "🔗 Share draft"}</button>
              <button onClick={() => setSettingsOpen(true)}
                className={`inline-flex items-center justify-center text-xs font-semibold px-3.5 rounded-full border transition active:scale-95 h-8 ${aiKey
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-300/50 dark:ring-emerald-700/40 hover:border-emerald-300 dark:hover:border-emerald-700"
                  : "bg-[#0A66C2] border-[#0A66C2] text-white shadow-[0_1px_6px_rgba(10,102,194,0.35)] hover:bg-[#004182] hover:border-[#004182]"
                }`}>
                {aiKey ? `✓ ${PROVIDER_LABELS[aiProvider]} AI Active` : "⚙ Enable AI"}
              </button>
              <button onClick={() => setDark(d => !d)}
                className="w-8 h-8 grid place-items-center rounded-full border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 transition text-sm shrink-0" aria-label="Toggle theme">
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
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
                          {aiLoading === "generateThought" && <span className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent w-3 h-3" />} {aiLoading === "generateThought" ? "Working…" : "✨ Thought"}
                        </button>
                        <button disabled={!!aiLoading} onClick={() => callCardAi("generateTitleHeader")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-medium bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700 disabled:opacity-40 transition">
                          {aiLoading === "generateTitleHeader" && <span className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent w-3 h-3" />} {aiLoading === "generateTitleHeader" ? "Working…" : "🤖 Title"}
                        </button>
                      </div>
                    </div>
                    <div className="border-y border-gray-200/60 dark:border-zinc-800">
                      <AiBar text={content} onResult={setContent} onBusy={setGlobalAi} />
                      <div className="px-3 py-2 flex flex-wrap items-center gap-1 border-y border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
                        <button title="Bold (Ctrl+B)" onClick={() => insertWrap("**")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-2 3.5 4.5 4.5 0 014 4.5A4.5 4.5 0 0115.5 20H6z"/><path d="M6 8h12M6 16h12" opacity="0.0"/></svg></button>
                        <button title="Italic (Ctrl+I)" onClick={() => insertWrap("*")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>
                        <button title="Strikethrough" onClick={() => insertWrap("~~")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 4H9a3 3 0 00-3 3v1h12"/><path d="M8 12h8"/><path d="M16 16a3 3 0 013 3v1H9a3 3 0 01-3-3v-1h12"/></svg></button>
                        <button title="Underline (Ctrl+U)" onClick={() => insertWrap("__")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6a6 6 0 006 6 6 6 0 006-6V4"/><path d="M4 20h16"/></svg></button>
                        <button title="Monospace" onClick={() => insertWrap("`")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
                        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1 self-center shrink-0" />
                        <button title="Bullet" onClick={() => insertAtCursor("• ")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2.5"/></svg></button>
                        <button title="Arrow" onClick={() => insertAtCursor(" → ")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
                        <button title="Hashtag" onClick={() => insertAtCursor(" #")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="9" y1="4" x2="7" y2="20"/><line x1="15" y1="4" x2="13" y2="20"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg></button>
                        <button title="Emoji" onClick={() => insertAtCursor(" ✨ ")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><span className="text-[11px] leading-none">✨</span></button>
                        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1 self-center shrink-0 hidden sm:block" />
                        {["😊", "👉", "✨"].map(e => (
                          <button key={e} onClick={() => insertAtCursor(` ${e} `)} className="p-2 text-xs rounded-[4px] hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition">{e}</button>
                        ))}
                      </div>
                      <div className="px-3 py-1.5 flex flex-wrap gap-1 bg-white dark:bg-zinc-900 border-b border-gray-200/60 dark:border-zinc-800">
                        {["•","◈","◎","→","↳","↓","✓","📌","♻️"].map(s => (
                          <button key={s} onClick={() => insertAtCursor(s + " ")} className="p-2 text-xs rounded-[4px] border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95 transition">{s}</button>
                        ))}
                      </div>
                      <textarea ref={editorRef} value={content} onKeyDown={handleKeyDown} onPaste={handlePaste} onChange={e => setContent(e.target.value)} placeholder="Card body — also your LinkedIn caption… (Ctrl+B bold, Ctrl+I italic, Ctrl+U underline)" className="w-full min-h-[180px] p-4 text-[14px] leading-[1.6] outline-none resize-y bg-white dark:bg-zinc-900 focus:bg-transparent focus:ring-2 focus:ring-blue-500/30 focus:border-transparent text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition" />
                      {fold.isFolded && (
                        <div className="mx-3 my-1 flex items-center gap-2 text-[11px]">
                          <span className="flex-1 border-t-2 border-dashed border-amber-300" />
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 whitespace-nowrap">✂️ LinkedIn Fold (…see more) {fold.isEarlyFold ? "· Fold triggered by line break" : `· ${FOLD_CONFIGS[viewport].chars}ch/${FOLD_CONFIGS[viewport].maxLines} lines`}</span>
                          <span className="flex-1 border-t-2 border-dashed border-amber-300" />
                        </div>
                      )}
                      <button onClick={() => { const el = editorRef.current; const sel = el ? content.slice(el.selectionStart, el.selectionEnd) || content.split("\n").find(l=>l.trim()) || content.slice(0,120) : content.slice(0,120); setThought(sel.slice(0,140)); setTab("card"); setCardTab("compose") }} className="mx-3 mb-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700">⚡ Send Hook to Card Studio</button>
                      <div className="mx-0 px-4 py-2 flex flex-wrap items-center gap-3 text-[11px] font-normal text-gray-400 dark:text-zinc-500 border-t border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
                        <span>{stats.words} words</span><span>·</span><span>{stats.lines} lines</span><span>·</span><span>{stats.chars}/3000</span><span>·</span><span>{stats.readingLabel}</span>
                        {lastSaved && <><span>·</span><span className="text-emerald-600">✓ Saved locally {new Date(lastSaved).toLocaleTimeString()}</span></>}
                        {unicodeRatio(markdownToUnicode(content)) > 0.3 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⚠️ {Math.round(unicodeRatio(markdownToUnicode(content))*100)}% unicode — keep styling on hooks</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5">Aspect preset</div>
                      <div className="flex gap-1.5">
                        {(["free","1:1","4:5"] as const).map(p => (
                          <button key={p} onClick={() => { setCardPreset(p); if(p==="1:1") setCardWidth(540); if(p==="4:5") setCardWidth(540) }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${cardPreset===p?"bg-[#0A66C2] text-white border-[#0A66C2]":"bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"}`}>{p==="free"?"Free":p==="1:1"?"1:1 1080×1080":"4:5 1080×1350"}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">Width</span>
                        <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums">{cardWidth}px</span>
                      </div>
                      <input type="range" min="300" max="700" value={cardWidth} onChange={e => setCardWidth(Number(e.target.value))} className="w-full" />
                    </div>
                    <label className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">80px safe zone</span><input type="checkbox" checked={safeZone} onChange={e=>setSafeZone(e.target.checked)} />
                    </label>
                    <label className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">Attribution</span><input type="checkbox" checked={showAttribution} onChange={e=>setShowAttribution(e.target.checked)} />
                    </label>
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
                  <button onClick={() => copyUnicode("caption")} className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition active:scale-[0.98] ${copied ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" : "bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700"}`}>
                    {copied ? "✓ Caption copied" : "Copy caption for LinkedIn"}
                  </button>
                  <button onClick={shareToLinkedIn} className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#0A66C2] text-white hover:bg-[#004182] transition active:scale-[0.98]"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg> Post to LinkedIn</button>
                  <p className="text-center text-[11px] text-gray-400 dark:text-zinc-500">Download the image, paste caption as your post text.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-zinc-800 shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
                  <div className="px-4 pt-3 pb-2 border-b border-gray-200/60 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-800 dark:text-zinc-200">Editor</span>
                      <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums">{stats.chars} / 3000</span>
                    </div>
                    <div className="mt-2 flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200/60 dark:border-zinc-700">
                      {(["write", "profile"] as const).map(id => (
                        <button key={id} onClick={() => setEditorTab(id)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${editorTab === id ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-sm border border-gray-200 dark:border-zinc-600" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"}`}>
                          {id === "write" ? "✎ Post" : "👤 Profile"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {editorTab === "write" ? (
                    <>
                      <AiBar text={content} onResult={setContent} onBusy={setGlobalAi} />
                      <div className="px-3 py-2 flex flex-wrap items-center gap-1 border-b border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
                        <button title="Bold (Ctrl+B)" onClick={() => insertWrap("**")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-2 3.5 4.5 4.5 0 014 4.5A4.5 4.5 0 0115.5 20H6z"/><path d="M6 8h12M6 16h12" opacity="0.0"/></svg></button>
                        <button title="Italic (Ctrl+I)" onClick={() => insertWrap("*")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg></button>
                        <button title="Strikethrough" onClick={() => insertWrap("~~")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 4H9a3 3 0 00-3 3v1h12"/><path d="M8 12h8"/><path d="M16 16a3 3 0 013 3v1H9a3 3 0 01-3-3v-1h12"/></svg></button>
                        <button title="Underline (Ctrl+U)" onClick={() => insertWrap("__")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6a6 6 0 006 6 6 6 0 006-6V4"/><path d="M4 20h16"/></svg></button>
                        <button title="Monospace" onClick={() => insertWrap("`")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></button>
                        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1 self-center shrink-0" />
                        <button title="Bullet" onClick={() => insertAtCursor("• ")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="2.5"/></svg></button>
                        <button title="Arrow" onClick={() => insertAtCursor(" → ")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
                        <button title="Hashtag" onClick={() => insertAtCursor(" #")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="9" y1="4" x2="7" y2="20"/><line x1="15" y1="4" x2="13" y2="20"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></svg></button>
                        <button title="Emoji" onClick={() => insertAtCursor(" ✨ ")} className="p-2 rounded-[4px] border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition"><span className="text-[11px] leading-none">✨</span></button>
                        <div className="w-px h-6 bg-gray-200 dark:bg-zinc-700 mx-1 self-center shrink-0 hidden sm:block" />
                        {["😊", "👉", "✨"].map(e => (
                          <button key={e} onClick={() => insertAtCursor(` ${e} `)} className="p-2 text-xs rounded-[4px] hover:bg-gray-100 dark:hover:bg-zinc-700 active:scale-95 transition">{e}</button>
                        ))}
                      </div>
                      <div className="px-3 py-1.5 flex flex-wrap gap-1 bg-white dark:bg-zinc-900 border-b border-gray-200/60 dark:border-zinc-800">
                        {["•","◈","◎","→","↳","↓","✓","📌","♻️"].map(s => (
                          <button key={s} onClick={() => insertAtCursor(s + " ")} className="p-2 text-xs rounded-[4px] border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 active:scale-95 transition">{s}</button>
                        ))}
                      </div>
                      <textarea ref={editorRef} value={content} onKeyDown={handleKeyDown} onPaste={handlePaste} onChange={e => setContent(e.target.value)} placeholder="Write your LinkedIn post… (Ctrl+B/I/U)" className="w-full min-h-[240px] p-4 text-[14px] leading-[1.6] outline-none resize-y bg-white dark:bg-zinc-900 focus:bg-transparent focus:ring-2 focus:ring-blue-500/30 focus:border-transparent text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition" />
                      {fold.isFolded && (
                        <div className="mx-3 my-1 flex items-center gap-2 text-[11px]">
                          <span className="flex-1 border-t-2 border-dashed border-amber-300" />
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 whitespace-nowrap">✂️ LinkedIn Fold (…see more) {fold.isEarlyFold ? "· Fold triggered by line break" : ""}</span>
                          <span className="flex-1 border-t-2 border-dashed border-amber-300" />
                        </div>
                      )}
                      <button onClick={() => { const el = editorRef.current; const sel = el ? content.slice(el.selectionStart, el.selectionEnd) || content.split("\n").find(l=>l.trim()) || content.slice(0,120) : content.slice(0,120); setThought(sel.slice(0,140)); setTab("card"); setCardTab("compose") }} className="mx-3 mb-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700">⚡ Send Hook to Card Studio</button>
                      <div className="mx-0 px-4 py-2 flex flex-wrap items-center gap-3 text-[11px] font-normal text-gray-400 dark:text-zinc-500 border-t border-gray-200/60 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/40">
                        <span>{stats.words} words</span><span>·</span><span>{stats.lines} lines</span><span>·</span><span>{stats.chars}/3000</span><span>·</span><span>{stats.readingLabel}</span>
                        {lastSaved && <><span>·</span><span className="text-emerald-600">✓ Saved locally {new Date(lastSaved).toLocaleTimeString()}</span></>}
                        {unicodeRatio(markdownToUnicode(content)) > 0.3 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⚠️ {Math.round(unicodeRatio(markdownToUnicode(content))*100)}% unicode</span>}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-2 text-[11px] font-normal text-gray-400 dark:text-zinc-500">Bold, italic & bullets → LinkedIn-safe Unicode</div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 space-y-3">
                      <div className="text-[11px] font-semibold tracking-wide uppercase text-gray-500 dark:text-zinc-400">Preview identity</div>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className={inputCls} />
                      <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Your headline" className={inputCls} />
                      <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Avatar URL" className={inputCls} />
                      <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn profile URL" className={inputCls} />
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500">Shown in Feed & Document previews. Nothing is uploaded — all local.</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Right: Tab Content ── */}
          <div className="space-y-4">

            {/* ═══ Feed Preview Tab ═══ */}
            {tab === "preview" && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
                    <div>
                      <div className="text-sm font-bold text-gray-800 dark:text-zinc-200">Preview</div>
                      <div className="text-[11px] text-gray-400 dark:text-zinc-500">Exactly as on LinkedIn · {viewport === "desktop" ? "Desktop" : "Mobile"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex p-1 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                      {(["desktop", "mobile"] as const).map(v => (
                        <button key={v} onClick={() => setViewport(v)} className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition ${viewport === v ? "bg-[#0A66C2] text-white shadow" : "text-gray-500 dark:text-zinc-400"}`}>{v === "desktop" ? "💻 Desktop (560px)" : "📱 Mobile (375px)"}</button>
                      ))}
                    </div>
                    <button onClick={() => copyUnicode("preview")}
                      className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full border transition active:scale-95 min-w-[96px] ${copied ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
                      {copied ? "✓ Copied!" : "📋 Copy"}
                    </button>
                    <button onClick={shareToLinkedIn} className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-full bg-[#0A66C2] text-white hover:bg-[#004182] transition active:scale-95 min-w-[128px]"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg> Post to LinkedIn</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800">
                  <span className="tabular-nums">{stats.chars} / 3000</span><span className="text-gray-300">·</span><span>{stats.words} words</span><span className="text-gray-300">·</span><span>{stats.lines} lines</span><span className="text-gray-300">·</span><span>#{stats.hashtags}</span><span className="text-gray-300">·</span><span>{stats.readingLabel}</span><span className="text-gray-300">·</span><span className={pastFold ? "text-amber-600" : "text-emerald-600"}>{pastFold ? `folded ${[...fold.hidden].length}ch past` : `${FOLD_CONFIGS[viewport].chars - [...beforeFold].length}ch to fold`} ({fold.reason})</span>
                </div>
                {fold.isEarlyFold && !expanded && (
                  <div className="text-xs px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">⚠️ Post truncates early due to line breaks before reaching the character limit</div>
                )}

                {/* Feed card */}
                <div className={`mx-auto transition-all ${viewport === "mobile" ? "max-w-[375px]" : "max-w-[560px]"}`}>
                  <div className="rounded-xl border border-[#e0dfdc] dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
                    {/* Post header */}
                    <div className="p-3 flex gap-3">
                      <img src={resolvedAvatar || avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-black/5" />
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
                    <div className="px-3 pb-3 text-[14px] leading-[1.6] break-words text-gray-900 dark:text-zinc-100">
                      {!expanded && pastFold ? (
                        <span className="whitespace-pre-wrap inline" dangerouslySetInnerHTML={{ __html: markdownToHtml(beforeFold) + '<span class="text-gray-400">…</span>' }} />
                      ) : null}
                      {!expanded && pastFold ? (
                        <button onClick={() => setExpanded(true)} className="inline text-gray-500 dark:text-zinc-400 hover:underline text-[14px] ml-1">…see more</button>
                      ) : (
                        <>
                          <span className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: markdownToHtml(content || "Your post will appear here…") }} />
                          {expanded && pastFold && (
                            <button onClick={() => setExpanded(false)} className="ml-1 text-gray-500 dark:text-zinc-400 hover:underline text-[14px]">Show less</button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Reactions */}
                    <div className="px-3 pb-2 flex items-center justify-between text-[12px] text-gray-500 dark:text-zinc-400 border-t border-gray-200 dark:border-zinc-800 pt-2">
                      <div className="flex items-center gap-1">
                        <span className="w-5 h-5 rounded-full bg-[#0A66C2] grid place-items-center text-white text-[10px]">👍</span>
                        <span className="w-5 h-5 rounded-full bg-red-500 grid place-items-center text-white text-[10px] -ml-1">❤️</span>
                        <span className="ml-1">248</span>
                      </div>
                      <div>12 comments · 4 reposts</div>
                    </div>

                    {/* Action bar */}
                    <div className="grid grid-cols-4 border-t border-gray-200 dark:border-zinc-800 text-sm">
                      {["👍 Like", "💬 Comment", "↗ Repost", "✉ Send"].map(lab => (
                        <button key={lab} className="py-2.5 flex items-center justify-center gap-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 font-medium text-xs transition">
                          {lab}
                        </button>
                      ))}
                    </div>
                  </div>


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
                  <div ref={cardRef} className={`w-full rounded-[12px] overflow-hidden shadow-2xl ${gradient.id === "corporate-white" ? "border border-gray-200" : ""}`} style={{ background: gradient.bg, maxWidth: `${cardWidth}px`, aspectRatio: cardPreset==="1:1" ? "1 / 1" : cardPreset==="4:5" ? "4 / 5" : undefined }}>
                    {/* macOS header */}
                    <div className="px-4 py-3 flex items-center justify-between" style={{ background: gradient.id === "corporate-white" ? "rgba(15,23,42,0.04)" : "rgba(255,255,255,0.05)", borderBottom: gradient.id === "corporate-white" ? "1px solid rgba(15,23,42,0.08)" : "1px solid rgba(255,255,255,0.1)" }}>
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
                    <div className={`p-6 md:p-8 ${safeZone ? "ring-2 ring-dashed ring-white/40 ring-offset-2 ring-offset-transparent m-2" : ""}`} style={safeZone ? { padding: "80px" } : undefined}>
                      <div className="font-bold leading-tight" style={{ color: textColor, fontFamily: "'Source Serif 4', serif", fontSize: [...cardTitle].length <=120 ? "32px" : [...cardTitle].length <=280 ? "24px" : "20px" }}>{cardTitle}</div>
                      <div className="mt-3 leading-5 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_br]:block [&_br]:h-1" style={{ color: textColor, opacity: 0.95, fontSize: [...content].length <=280 ? "14px" : "13px" }} dangerouslySetInnerHTML={{ __html: cardHtml }} />
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
                    {showAttribution && <div className="px-6 py-4 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
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
                    </div>}
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
        <footer className="max-w-[1280px] mx-auto px-4 pb-10">
          <div className="border-t border-gray-200/50 dark:border-zinc-800 pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:items-center">
              <div className="flex items-center gap-3 self-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A66C2] to-indigo-500 grid place-items-center text-white font-bold text-xs shadow-sm shrink-0">in</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100 leading-none">Content Crafter</div>
                  <div className="text-xs font-normal text-gray-500 dark:text-zinc-400">Private by design — your content never leaves your browser · MIT</div>
                </div>
              </div>
              <div className="flex items-center gap-3 self-center">
                <img src={resolvedAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-zinc-700 shrink-0" />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-gray-700 dark:text-zinc-300 leading-none">Satya Dileep <span className="font-normal text-gray-500">· PM @ Pegasystems, Hyderabad</span></div>
                  <div className="text-[11px] font-normal text-gray-500 dark:text-zinc-500">Obsessed with great products, great taste</div>
                </div>
                <div className="flex items-center gap-2 ml-1">
                  <a href="https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/" target="_blank" className="w-7 h-7 grid place-items-center rounded-full bg-[#0A66C2] text-white hover:bg-[#004182] transition"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/></svg></a>
                  <a href="https://satyadileep.github.io" target="_blank" className="w-7 h-7 grid place-items-center rounded-full border border-gray-200 dark:border-zinc-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800 transition text-[11px]">↗</a>
                </div>
              </div>
            </div>
          </div>
        </footer>

        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {drawerOpen && (
          <div className="fixed inset-0 z-40" onClick={()=>setDrawerOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div onClick={e=>e.stopPropagation()} className="absolute right-0 top-0 h-full w-[340px] bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 p-4 overflow-auto">
              <div className="flex items-center justify-between"><div className="font-bold">Recent Drafts</div><button onClick={()=>setDrawerOpen(false)} className="w-8 h-8 grid place-items-center rounded-full border">✕</button></div>
              <div className="mt-4 space-y-2">
                {drafts.length===0 && <div className="text-sm text-gray-400">No drafts yet</div>}
                {drafts.map(d=>(
                  <div key={d.id} className="p-3 rounded-xl border border-gray-200 dark:border-zinc-700">
                    <div className="text-xs font-semibold truncate">{d.title}</div>
                    <div className="text-[11px] text-gray-400">{new Date(d.updatedAt).toLocaleString()}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={()=>{ setContent(d.content); setDrawerOpen(false) }} className="text-xs px-2 py-1 rounded-full bg-[#0A66C2] text-white">Load</button>
                      <button onClick={()=>{ const nd=drafts.filter(x=>x.id!==d.id); setDrafts(nd); saveDrafts(nd) }} className="text-xs px-2 py-1 rounded-full border">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {bubble && (
          <div className="fixed z-40 -translate-x-1/2 -translate-y-full flex items-center gap-1 p-1.5 rounded-xl bg-gray-900 text-white shadow-xl border border-white/10" style={{ left: bubble.x, top: bubble.y }}>
            <button onMouseDown={e=>{e.preventDefault(); const el=editorRef.current; if(!el){return} const s=el.selectionStart,e2=el.selectionEnd; const sel=content.slice(s,e2); const w="**"; const next=content.slice(0,s)+w+sel+w+content.slice(e2); setContent(next)}} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20">𝗕 Bold</button>
            <button onMouseDown={e=>{e.preventDefault(); const el=editorRef.current; if(!el)return; const s=el.selectionStart,e2=el.selectionEnd; const sel=content.slice(s,e2); const next=content.slice(0,s)+"*"+sel+"*"+content.slice(e2); setContent(next)}} className="px-2.5 py-1 text-xs italic rounded-lg bg-white/10 hover:bg-white/20">𝘪 Italic</button>
            <button onMouseDown={e=>{e.preventDefault(); insertAtCursor("• ")}} className="px-2 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20">• Bullet</button>
            <button onMouseDown={e=>{e.preventDefault(); setThought(bubble.text.slice(0,140)); setTab("card"); setCardTab("compose"); setBubble(null)}} className="px-2.5 py-1 text-xs rounded-lg bg-violet-600 hover:bg-violet-500">🎨 Make Quote Card</button>
          </div>
        )}
        {globalAi && (
          <div className="fixed inset-0 z-40 grid place-items-center bg-white/30 dark:bg-black/30 backdrop-blur-[6px] p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-white/60 dark:border-zinc-700 shadow-[0_20px_60px_rgba(15,23,42,0.18)] p-6 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-gradient-to-br from-[#0A66C2] to-indigo-500 grid place-items-center shadow-lg">
                <span className="w-5 h-5 rounded-full border-2 border-white/90 border-t-transparent animate-spin" />
              </div>
              <div className="mt-3 font-semibold text-sm text-gray-800 dark:text-zinc-100">{globalAi}</div>
              <div className="text-xs text-gray-500 dark:text-zinc-400 mt-1">✨ {PROVIDER_LABELS[aiProvider]} is working — editing is paused</div>
              <div className="mt-4 h-1 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full w-1/3 bg-gradient-to-r from-[#0A66C2] to-indigo-500 rounded-full animate-[shimmer_1.2s_ease-in-out_infinite]" style={{ animationName: "shimmer" }} />
              </div>
            </div>
            <style>{`@keyframes shimmer{0%{transform:translateX(-120%)}100%{transform:translateX(350%)}}`}</style>
          </div>
        )}
      </div>
    </div>
  )
}
