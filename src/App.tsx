import { useRef, useState, useMemo, useEffect } from "react"
import { toPng } from "html-to-image"
import { markdownToUnicode, markdownToHtml } from "./lib/unicode"
import { callGemini } from "./lib/gemini"
import { useAuth } from "./lib/auth"
import AiBar from "./components/AiBar"
import SettingsModal from "./components/SettingsModal"

const FOLD = 210
const DEFAULT_POST = `Your catchy title here — make it **bold** and irresistible.

This is the hook. You have 3 lines (~210 chars) before LinkedIn collapses your post with "...see more". Make it count.

**Adipiscing mauris laoreet at pulvinar dui mi vitae vel malesuada.**
* This is a bullet point.
* And another one.
* This is an ordered list.
1. First item
2. Second item
3. Third item

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

function useSystemDark() {
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

export default function App() {
  const { user, apiKey } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tab, setTab] = useState<"preview"|"format"|"card">("preview")
  const [device, setDevice] = useState<"mobile"|"tablet"|"desktop">("desktop")
  const [dark, setDark] = useSystemDark()
  const [showFold, setShowFold] = useState(true)
  const [content, setContent] = useState(DEFAULT_POST)
  const [name, setName] = useState("Satya Dileep Kumar Thotakura")
  const [headline, setHeadline] = useState("Product Manager | Pegasystems • Building in public")
  const [avatar, setAvatar] = useState("https://i.pravatar.cc/200?img=33")
  const [linkedinUrl, setLinkedinUrl] = useState("https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/")
  const [gradient, setGradient] = useState(GRADIENTS[2])
  const [cardHeader, setCardHeader] = useState("AI-Byte Series #Day24")
  const [cardTitle, setCardTitle] = useState("Your catchy title here")
  const [thought, setThought] = useState("")
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [cardWidth, setCardWidth] = useState(500)
  const [textColor, setTextColor] = useState("#f0f0f0")
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const unicode = useMemo(()=> markdownToUnicode(content), [content])
  const cardHtml = useMemo(()=> markdownToHtml(content), [content])
  const thoughtHtml = useMemo(()=> markdownToHtml(thought), [thought])
  const stats = useMemo(()=> ({
    chars: content.length,
    words: content.trim()? content.trim().split(/\s+/).length : 0,
    lines: content.split("\n").length,
    foldChars: Math.min(content.length, FOLD),
  }), [content])

  const beforeFold = content.slice(0, FOLD)

  function insertWrap(wrap: string, placeholder="text"){
    const el = editorRef.current
    if(!el){ setContent(c=>c+wrap+placeholder+wrap); return }
    const s = el.selectionStart, e = el.selectionEnd
    const sel = content.slice(s,e) || placeholder
    const before = content.slice(0,s)
    const after = content.slice(e)
    const next = before + wrap + sel + wrap + after
    setContent(next)
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+wrap.length, s+wrap.length+sel.length)},0)
  }
  function insertAtCursor(txt: string){
    const el = editorRef.current
    if(!el){ setContent(c=>c+txt); return }
    const s = el.selectionStart, e = el.selectionEnd
    const next = content.slice(0,s)+txt+content.slice(e)
    setContent(next)
    setTimeout(()=>{ el.focus(); el.setSelectionRange(s+txt.length, s+txt.length)},0)
  }
  async function copyUnicode(){
    await navigator.clipboard.writeText(unicode)
    setCopied(true); setTimeout(()=>setCopied(false),1800)
  }
  async function exportImage(ref: React.RefObject<HTMLDivElement|null>){
    if(!ref.current) return
    const dataUrl = await toPng(ref.current, { cacheBust:true, pixelRatio:2 })
    const a=document.createElement("a"); a.download="linkedin-card.png"; a.href=dataUrl; a.click()
  }

  async function callCardAi(action: "generateThought" | "generateTitleHeader") {
    if (!apiKey) { setSettingsOpen(true); return }
    if (!content.trim()) return
    setAiLoading(action)
    try {
      const result = await callGemini(action, content, apiKey)
      if (action === "generateThought") {
        setThought(result)
      } else if (action === "generateTitleHeader") {
        const parts = result.split("|").map(s => s.trim())
        if (parts[0]) setCardTitle(parts[0])
        if (parts[1]) setCardHeader(parts[1])
      }
    } catch (e: any) {
      alert(e.message || "AI failed")
    } finally {
      setAiLoading(null)
    }
  }

  const deviceWidths = { mobile: "max-w-[390px]", tablet: "max-w-[520px]", desktop: "max-w-[560px]" }

  return (
    <div className={dark?"dark bg-[#111113] text-zinc-100":"bg-[#f4f2ee] text-zinc-900"} >
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-[1280px] mx-auto px-4 h-[56px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2] grid place-items-center text-white font-bold text-[16px]">in</div>
            <div>
              <div className="font-bold leading-none text-[16px]">Content Crafter</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-none">Wand for LinkedIn</div>
            </div>
            <span className="hidden sm:inline-flex ml-2 text-[11px] px-2 py-1 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">Free · No signup</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setSettingsOpen(true)} className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${apiKey?"bg-emerald-50 border-emerald-200 text-emerald-700":"bg-amber-50 border-amber-200 text-amber-700"}`}>{apiKey?"✓ AI Ready":"⚙️ Add Gemini Key"}</button>
            {user ? <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border"/> : <button onClick={()=>setSettingsOpen(true)} className="text-xs px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-800">Sign in</button>}
            <a href="https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn" target="_blank" className="hidden md:inline-flex text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">⭐ Star</a>
            <button onClick={()=>setDark(!dark)} className="w-8 h-8 grid place-items-center rounded-full border border-zinc-200 dark:border-zinc-700">{dark?"☀️":"🌙"}</button>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 flex items-center gap-2 py-2 overflow-auto">
          {[
            ["preview","Feed Preview","Preview your post"],
            ["format","Formatter","Unicode formatting"],
            ["card","Image Card","Export as PNG"],
          ].map(([id,label,sub])=>(
            <button key={id} onClick={()=>setTab(id as any)} className={`text-left px-4 py-2.5 rounded-xl border flex-1 min-w-[140px] transition ${tab===id?"bg-[#0A66C2] text-white border-[#0A66C2] shadow":"bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"}`}>
              <div className="text-[13px] font-semibold leading-none">{label}</div>
              <div className={`text-[11px] leading-none mt-1 ${tab===id?"text-white/80":"text-zinc-500"}`}>{sub}</div>
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <div className="space-y-4 lg:sticky lg:top-[124px] h-fit">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
              <div className="font-semibold text-sm">Editor</div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${content.length>3000?"bg-red-500":content.length>FOLD?"bg-amber-500":"bg-emerald-500"}`}/>
                <span className="text-xs text-zinc-500">{stats.chars} / 3000</span>
              </div>
            </div>

            <AiBar text={content} onResult={setContent} />
            <div className="p-3 flex flex-wrap gap-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900">
              {[
                ["𝐁 Bold", "**"],
                ["𝘐 Italic","*"],
                ["S̶ Strike","~~"],
                ["• Bullet","• "],
                ["→ Arrow"," → "],
                ["# Hashtag"," #"],
              ].map(([lab,wrap])=>(
                <button key={lab} onClick={()=> lab.includes("Bullet")||lab.includes("Arrow")||lab.includes("Hashtag") ? insertAtCursor(wrap) : lab.includes("Strike") ? insertWrap(wrap) : insertWrap(wrap)} className="px-2.5 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50">
                  {lab}
                </button>
              ))}
              <button onClick={()=>insertAtCursor(" 😊 ")} className="px-2.5 py-1.5 text-xs rounded-full bg-white dark:bg-zinc-800 border">😊</button>
              <button onClick={()=>insertAtCursor(" 👉 ")} className="px-2.5 py-1.5 text-xs rounded-full bg-white dark:bg-zinc-800 border">👉</button>
              <button onClick={()=>insertAtCursor(" ✨ ")} className="px-2.5 py-1.5 text-xs rounded-full bg-white dark:bg-zinc-800 border">✨</button>
            </div>

            <textarea
              ref={editorRef}
              value={content}
              onChange={e=>setContent(e.target.value)}
              placeholder="Write your LinkedIn post... use **bold**, *italic*, ~~strike~~, bullets..."
              className="w-full min-h-[280px] p-4 text-[14px] leading-6 outline-none resize-y bg-white dark:bg-zinc-900 placeholder:text-zinc-400"
            />

            <div className="px-3 py-2.5 flex items-center gap-3 text-[11px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <span>{stats.words} words</span><span>·</span><span>{stats.lines} lines</span><span>·</span>
              <span className={stats.chars>FOLD?"text-amber-600 font-medium":""}>{stats.foldChars}/{FOLD} above fold</span>
              <label className="ml-auto flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showFold} onChange={e=>setShowFold(e.target.checked)} className="accent-[#0A66C2]"/>
                show fold
              </label>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2">
              <button onClick={copyUnicode} className="py-2.5 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#004182] transition">
                {copied?"✓ Copied!":"Copy for LinkedIn"}
              </button>
              <button onClick={()=> tab==="card" ? exportImage(cardRef) : exportImage(feedRef)} className="py-2.5 rounded-xl bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-sm font-semibold">
                Export PNG
              </button>
            </div>
            <div className="px-3 pb-3 flex gap-2">
              <button onClick={()=> apiKey ? null : setSettingsOpen(true)} className="flex-1 py-2 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800">{apiKey?"✨ AI Assistant":"🔑 Enable AI"}</button>
              <button onClick={()=>setContent(DEFAULT_POST)} className="px-4 py-2 rounded-full border text-xs">Reset</button>
            </div>
          </div>

          <details className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
            <summary className="font-semibold text-sm cursor-pointer list-none flex items-center justify-between">👤 Profile & Card Settings <span className="text-zinc-400">›</span></summary>
            <div className="mt-4 grid gap-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"/>
              <input value={headline} onChange={e=>setHeadline(e.target.value)} placeholder="Headline" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800 dark:border-zinc-700"/>
              <input value={avatar} onChange={e=>setAvatar(e.target.value)} placeholder="Avatar URL" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800 dark:border-zinc-700"/>
              <input value={linkedinUrl} onChange={e=>setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800 dark:border-zinc-700"/>
              {tab==="card" && <>
                <input value={cardHeader} onChange={e=>setCardHeader(e.target.value)} placeholder="Card Header (e.g. AI-Byte Series #Day24)" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"/>
                <input value={cardTitle} onChange={e=>setCardTitle(e.target.value)} placeholder="Card Title" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"/>
                <input value={thought} onChange={e=>setThought(e.target.value)} placeholder="Highlighted thought (optional)" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"/>
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">Card Width: {cardWidth}px</div>
                  <input type="range" min="300" max="700" value={cardWidth} onChange={e=>setCardWidth(Number(e.target.value))} className="w-full accent-[#5b21b6]"/>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">Text Color</div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer bg-transparent p-0.5"/>
                    <span className="text-xs text-zinc-500">{textColor}</span>
                    <button onClick={()=>setTextColor(gradient.text)} className="ml-auto text-xs px-2 py-1 rounded-full border">Reset to theme</button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-zinc-500 mb-2">Gradient Theme</div>
                  <div className="grid grid-cols-6 gap-2">
                    {GRADIENTS.map(g=>(
                      <button key={g.id} onClick={()=>{ setGradient(g); setTextColor(g.text) }}
                        className={`relative w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:scale-105 ${gradient.id===g.id?"border-white shadow-lg scale-110 ring-2 ring-zinc-400 dark:ring-zinc-500":"border-transparent hover:border-zinc-300"}`}
                        style={{background:g.bg}} title={g.id}>
                        {gradient.id===g.id && <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>}
              <div className="flex gap-2">
                <button onClick={()=>setDevice("mobile")} className={`flex-1 py-2 rounded-full text-xs font-medium border transition ${device==="mobile"?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white":"bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>📱 Mobile</button>
                <button onClick={()=>setDevice("tablet")} className={`flex-1 py-2 rounded-full text-xs font-medium border transition ${device==="tablet"?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white":"bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>📱 Tablet</button>
                <button onClick={()=>setDevice("desktop")} className={`flex-1 py-2 rounded-full text-xs font-medium border transition ${device==="desktop"?"bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white":"bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"}`}>🖥️ Desktop</button>
              </div>
            </div>
          </details>            <div className="bg-gradient-to-br from-[#0A66C2] to-[#004182] text-white rounded-2xl p-5">
            <div className="text-sm font-semibold">Write better. Post with confidence.</div>
            <div className="text-xs opacity-80 mt-1.5 leading-relaxed">Preview your post exactly as readers will see it. One click to copy formatting that LinkedIn keeps.</div>
            <div className="mt-3">
              <a href="https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn" target="_blank" className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition">View on GitHub →</a>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {tab==="preview" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">{device} · {dark?"dark mode":"light mode"}</div>
                <button onClick={()=>setExpanded(!expanded)} className="text-xs px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900">{expanded?"Collapse":"See more"}</button>
              </div>
              <div className={`mx-auto transition-all ${deviceWidths[device]}`}>
                <div ref={feedRef} className={`rounded-xl border overflow-hidden shadow-sm ${dark?"bg-zinc-900 border-zinc-800 text-zinc-100":"bg-white border-zinc-200"}`}>
                  <div className="p-3 flex gap-3">
                    <img src={avatar} onError={e=> (e.currentTarget.src="https://i.pravatar.cc/200")} alt="avatar" className="w-12 h-12 rounded-full object-cover flex-shrink-0"/>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[14px] leading-none truncate">{name || "Your Name"}</div>
                          <div className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-1">{headline || "Your headline"}</div>
                          <div className="text-[12px] text-zinc-500 flex items-center gap-1">now · 🌐 <span className="hidden sm:inline">· 1m</span></div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={linkedinUrl} target="_blank" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold">+ Follow</a>
                          <button className="w-8 h-8 grid place-items-center text-zinc-500">⋯</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3 text-[14px] leading-[1.45] break-words">
                    {showFold && !expanded && content.length>FOLD ? (
                      <>
                        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: markdownToHtml(beforeFold) }} />
                        <span className="bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-400">{content.slice(Math.max(0,FOLD-18),FOLD)}</span>
                        <span className="text-zinc-500">…</span>
                        <button onClick={()=>setExpanded(true)} className="ml-1 text-zinc-500 hover:underline text-[14px]">...see more</button>
                        <div className="mt-2 text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">✂️ Cutoff at {FOLD} chars — hook must land before here</div>
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: markdownToHtml(content || "Your post will appear here...") }} />
                    )}
                    {expanded && content.length>FOLD && <button onClick={()=>setExpanded(false)} className="ml-2 text-zinc-500 hover:underline">Show less</button>}
                  </div>

                  <div className="px-3 pb-2 flex items-center justify-between text-[12px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                    <div className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-[#0A66C2] grid place-items-center text-white text-[10px]">👍</span>
                      <span className="w-5 h-5 rounded-full bg-red-500 grid place-items-center text-white text-[10px] -ml-1">❤️</span>
                      <span className="ml-1">248</span>
                    </div>
                    <div>12 comments · 4 reposts</div>
                  </div>
                  <div className="grid grid-cols-4 border-t border-zinc-100 dark:border-zinc-800 text-sm">
                    {[
                      ["👍 Like","Like"],
                      ["💬 Comment","Comment"],
                      ["↗ Repost","Repost"],
                      ["✉ Send","Send"],
                    ].map(([icon,label])=>(
                      <button key={label} className="py-2.5 flex items-center justify-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium text-xs">
                        <span>{icon.split(" ")[0]}</span> {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500 justify-center">
                  <span>LinkedIn truncates at ~210 chars</span>
                  <span className="w-1 h-1 bg-zinc-400 rounded-full"/>
                  <span>{content.length>FOLD ? `${content.length-FOLD} chars hidden` : "All visible"}</span>
                </div>
              </div>
            </>
          )}

          {tab==="format" && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Formatted Output</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Paste-ready</span>
                </div>
                <div className="mt-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 min-h-[220px] whitespace-pre-wrap break-words text-[14px] leading-6">
                  {unicode || <span className="text-zinc-400">Formatted output appears here...</span>}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border text-center"><div className="font-bold text-sm">{unicode.length}</div><div className="text-zinc-500">chars</div></div>
                  <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border text-center"><div className="font-bold text-sm">{unicode.trim()?unicode.trim().split(/\s+/).length:0}</div><div className="text-zinc-500">words</div></div>
                  <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border text-center"><div className="font-bold text-sm">{unicode.split("\n").length}</div><div className="text-zinc-500">lines</div></div>
                </div>
                <button onClick={copyUnicode} className="mt-3 w-full py-3 rounded-xl bg-[#0A66C2] text-white font-semibold hover:bg-[#004182]">{copied?"✓ Copied to clipboard":"📋 Copy Formatted for LinkedIn"}</button>
                <div className="mt-2 text-[11px] text-zinc-500 text-center">Formatting survives paste on LinkedIn</div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">How it works</div>
                <ul className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200 list-disc pl-4">
                  <li>LinkedIn doesn't support Markdown — we convert to Unicode Mathematical Sans-Serif.</li>
                  <li>Formatting survives paste: bold, italic, strikethrough, bullets, arrows.</li>
                  <li>Character count stays identical for LinkedIn limits.</li>
                </ul>
              </div>
            </div>
          )}

          {tab==="card" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Image Card</div>
                <button onClick={()=>exportImage(cardRef)} className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">⬇ Download PNG</button>
              </div>
              <div className="flex justify-center">
                <div ref={cardRef} className="w-full rounded-[12px] overflow-hidden shadow-2xl" style={{background: gradient.bg, maxWidth: `${cardWidth}px`}}>
                  {/* macOS-style card header */}
                  <div className="px-4 py-3 flex items-center justify-between" style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)"}}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium ml-2" style={{color: textColor}}>{cardHeader}</span>
                    </div>
                    <div className="flex items-center justify-center p-1.5 rounded-md" style={{background:"rgba(128,128,128,0.3)", color: textColor}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                      </svg>
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="p-6 md:p-8">
                    <div className="text-[28px] md:text-[32px] font-bold leading-tight" style={{color: textColor, fontFamily:"'Source Serif 4', serif"}}>{cardTitle}</div>
                    <div className="mt-4 whitespace-pre-wrap text-[14px] leading-6" style={{color: textColor, opacity:0.95}} dangerouslySetInnerHTML={{ __html: cardHtml }} />
                    {thought && (
                      <div className="mt-4 text-sm leading-6 p-4 rounded-lg" style={{
                        background: "rgba(255,255,255,0.05)",
                        borderLeft: "4px solid rgba(255,255,255,0.2)",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                        fontStyle: "italic",
                        color: textColor,
                      }} dangerouslySetInnerHTML={{ __html: `"${thoughtHtml}"` }} />
                    )}
                  </div>

                  {/* Glass-effect footer */}
                  <div className="px-6 py-4 flex items-center justify-between" style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 0 10px rgba(255,255,255,0.1)"}}>
                    <div className="flex items-center gap-3">
                      <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" style={{border:`2px solid ${textColor}`}}/>
                      <div>
                        <div className="font-semibold text-sm leading-none" style={{color: textColor}}>{name}</div>
                        <div className="text-xs mt-1" style={{color: textColor, opacity:0.8}}>{headline}</div>
                      </div>
                    </div>
                    <a href={linkedinUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-[#0077B5] text-white transition hover:bg-[#005582]">
                      Follow me
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* AI actions for card */}
              <div className="flex gap-2">
                <button disabled={!!aiLoading} onClick={()=>callCardAi("generateThought")} className="flex-1 py-2 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
                  {aiLoading==="generateThought"?"…":"✨ Generate Thought"}
                </button>
                <button disabled={!!aiLoading} onClick={()=>callCardAi("generateTitleHeader")} className="flex-1 py-2 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800 hover:bg-zinc-50 disabled:opacity-50">
                  {aiLoading==="generateTitleHeader"?"…":"🤖 Auto-Generate Title & Header"}
                </button>
              </div>

              <div className="text-xs text-zinc-500 text-center">17 themes · Markdown content · Retina export</div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0A66C2] grid place-items-center text-white text-xs">✦</div>
            <div className="text-xs">
              <div className="font-semibold">Free & open source</div>
              <div className="text-zinc-500 dark:text-zinc-400">No account. No tracking. Your content stays in your browser.</div>
            </div>
            <a href="https://github.com/SatyaDileep/Content-Crafting-Wand-For-LinkedIn" target="_blank" className="ml-auto hidden sm:inline-flex text-xs font-semibold px-4 py-2 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">Star on GitHub</a>
          </div>
        </div>
      </main>

      <footer className="max-w-[1280px] mx-auto px-4 pb-8 text-center text-xs text-zinc-500">
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <a href={linkedinUrl} target="_blank" className="underline">satya-dileep</a> · MIT · Open Source
        </div>
      </footer>
      <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} />
    </div>
  )
}
