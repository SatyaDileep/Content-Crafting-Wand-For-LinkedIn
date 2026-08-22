import { useRef, useState, useMemo } from "react"
import { toPng } from "html-to-image"
import { markdownToUnicode } from "./lib/unicode"

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
  { id: "midnight", bg: "linear-gradient(135deg,#0f172a,#334155)", text: "#fff" },
  { id: "sunset", bg: "linear-gradient(135deg,#ff6a00,#ee0979)", text: "#fff" },
  { id: "ocean", bg: "linear-gradient(135deg,#0A66C2,#00c6ff)", text: "#fff" },
  { id: "forest", bg: "linear-gradient(135deg,#134e5e,#71b280)", text: "#fff" },
  { id: "paper", bg: "linear-gradient(135deg,#fdfbf7,#f5efe6)", text: "#1a1a1a" },
]

export default function App() {
  const [tab, setTab] = useState<"preview"|"format"|"card">("preview")
  const [device, setDevice] = useState<"mobile"|"desktop">("desktop")
  const [dark, setDark] = useState(false)
  const [showFold, setShowFold] = useState(true)
  const [content, setContent] = useState(DEFAULT_POST)
  const [name, setName] = useState("Satya Dileep Kumar Thotakura")
  const [headline, setHeadline] = useState("Product Manager | Pegasystems • Building in public")
  const [avatar, setAvatar] = useState("https://i.pravatar.cc/200?img=33")
  const [linkedinUrl, setLinkedinUrl] = useState("https://www.linkedin.com/in/satya-dileep-kumar-thotakura-9b25021b/")
  const [gradient, setGradient] = useState(GRADIENTS[2])
  const [cardTitle, setCardTitle] = useState("Your catchy title here")
  const [thought, setThought] = useState("")
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const unicode = useMemo(()=> markdownToUnicode(content), [content])
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

  return (
    <div className={dark?"dark bg-[#0a0a0a] text-white":"bg-[#f4f2ee] text-zinc-900"} >
      <header className="sticky top-0 z-30 backdrop-blur bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-[1280px] mx-auto px-4 h-[56px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#0A66C2] grid place-items-center text-white font-bold text-[16px]">in</div>
            <div>
              <div className="font-bold leading-none text-[16px]">Content Crafter</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-none">Wand for LinkedIn • Open Source</div>
            </div>
            <span className="hidden sm:inline-flex ml-2 text-[11px] px-2 py-1 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black">v1.0 • Netlify Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://github.com" target="_blank" className="hidden md:inline-flex text-xs font-medium px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">⭐ Star on GitHub</a>
            <button onClick={()=>setDark(!dark)} className="w-8 h-8 grid place-items-center rounded-full border border-zinc-200 dark:border-zinc-700">{dark?"☀️":"🌙"}</button>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-4 flex items-center gap-2 py-2 overflow-auto">
          {[
            ["preview","Feed Preview","Realistic mockup"],
            ["format","Rich Text Formatter","Unicode • Copy"],
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

            <div className="p-3 flex flex-wrap gap-1.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900">
              {[
                ["𝗕 Bold", "**"],
                ["𝘐 Italic","*"],
                ["• Bullet","• "],
                ["→ Arrow"," → "],
                ["# Hashtag"," #"],
              ].map(([lab,wrap])=>(
                <button key={lab} onClick={()=> lab.includes("Bullet")||lab.includes("Arrow")||lab.includes("Hashtag") ? insertAtCursor(wrap) : insertWrap(wrap)} className="px-2.5 py-1.5 text-xs font-medium rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50">
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
              placeholder="Write your LinkedIn post... use **bold**, *italic*, bullets..."
              className="w-full min-h-[280px] p-4 text-[14px] leading-6 outline-none resize-y bg-white dark:bg-zinc-900 placeholder:text-zinc-400"
            />

            <div className="px-3 py-2.5 flex items-center gap-3 text-[11px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <span>{stats.words} words</span><span>•</span><span>{stats.lines} lines</span><span>•</span>
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
              <button onClick={()=>{
                const enhanced = content.replace(/make it \*\*bold\*\*/i,"make it **bold & scroll-stopping**").replace(/This is the hook/i,"🔥 This is the hook — 3 seconds to stop the scroll")
                if(enhanced===content) setContent(c=> "✨ " + c + "\n\n—\nP.S. What would you add?")
                else setContent(enhanced)
              }} className="flex-1 py-2 rounded-full border text-xs font-medium bg-white dark:bg-zinc-800">✨ Auto-Enhance</button>
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
                <input value={cardTitle} onChange={e=>setCardTitle(e.target.value)} placeholder="Card Title" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"/>
                <input value={thought} onChange={e=>setThought(e.target.value)} placeholder="Highlighted thought (optional)" className="w-full px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"/>
                <div className="flex gap-2 flex-wrap">
                  {GRADIENTS.map(g=>(
                    <button key={g.id} onClick={()=>setGradient(g)} className={`w-10 h-10 rounded-full border-2 ${gradient.id===g.id?"border-zinc-900 dark:border-white":"border-white shadow"}`} style={{background:g.bg}} title={g.id}/>
                  ))}
                </div>
              </>}
              <div className="flex gap-2">
                <button onClick={()=>setDevice("mobile")} className={`flex-1 py-2 rounded-full text-xs font-medium border ${device==="mobile"?"bg-zinc-900 text-white":"bg-white dark:bg-zinc-800"}`}>📱 Mobile</button>
                <button onClick={()=>setDevice("desktop")} className={`flex-1 py-2 rounded-full text-xs font-medium border ${device==="desktop"?"bg-zinc-900 text-white":"bg-white dark:bg-zinc-800"}`}>🖥️ Desktop</button>
              </div>
            </div>
          </details>

          <div className="bg-[#0A66C2] text-white rounded-2xl p-4">
            <div className="text-sm font-semibold">Why open source?</div>
            <div className="text-xs opacity-90 mt-1 leading-relaxed">No paywall. No login. Craft beautiful LinkedIn posts, preview exactly as they appear in feed, and copy Unicode formatting that actually sticks on LinkedIn.</div>
            <div className="mt-3 flex gap-2">
              <a href="#" className="text-xs font-semibold bg-white text-[#0A66C2] px-3 py-1.5 rounded-full">Deploy to Netlify</a>
              <a href="#" className="text-xs font-semibold bg-white/15 px-3 py-1.5 rounded-full border border-white/20">Read Docs</a>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {tab==="preview" && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">Preview • {device} • {dark?"dark":"light"} • {showFold?"fold on":"fold off"}</div>
                <button onClick={()=>setExpanded(!expanded)} className="text-xs px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-900">{expanded?"Collapse":"See more"}</button>
              </div>
              <div className={`mx-auto transition-all ${device==="mobile"?"max-w-[390px]":"max-w-[560px]"}`}>
                <div ref={feedRef} className={`rounded-xl border overflow-hidden shadow-sm ${dark?"bg-zinc-900 border-zinc-800 text-zinc-100":"bg-white border-zinc-200"}`}>
                  <div className="p-3 flex gap-3">
                    <img src={avatar} onError={e=> (e.currentTarget.src="https://i.pravatar.cc/200")} alt="avatar" className="w-12 h-12 rounded-full object-cover flex-shrink-0"/>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[14px] leading-none truncate">{name || "Your Name"}</div>
                          <div className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-tight line-clamp-1">{headline || "Your headline"}</div>
                          <div className="text-[12px] text-zinc-500 flex items-center gap-1">now • 🌐 <span className="hidden sm:inline">• 1m</span></div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={linkedinUrl} target="_blank" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#0A66C2] text-[#0A66C2] text-xs font-semibold">+ Follow</a>
                          <button className="w-8 h-8 grid place-items-center text-zinc-500">⋯</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3 text-[14px] leading-[1.45] whitespace-pre-wrap break-words">
                    {showFold && !expanded && content.length>FOLD ? (
                      <>
                        <span>{beforeFold}</span>
                        <span className="bg-amber-100 dark:bg-amber-900/30 border-b-2 border-amber-400">{content.slice(Math.max(0,FOLD-18),FOLD)}</span>
                        <span className="text-zinc-500">…</span>
                        <button onClick={()=>setExpanded(true)} className="ml-1 text-zinc-500 hover:underline text-[14px]">...see more</button>
                        <div className="mt-2 text-[11px] inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">✂️ Cutoff at {FOLD} chars — hook must land before here</div>
                      </>
                    ) : (
                      <span>{content || <span className="text-zinc-400">Your post will appear here...</span>}</span>
                    )}
                    {expanded && content.length>FOLD && <button onClick={()=>setExpanded(false)} className="ml-2 text-zinc-500 hover:underline">Show less</button>}
                  </div>

                  <div className="px-3 pb-2 flex items-center justify-between text-[12px] text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                    <div className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-[#0A66C2] grid place-items-center text-white text-[10px]">👍</span>
                      <span className="w-5 h-5 rounded-full bg-red-500 grid place-items-center text-white text-[10px] -ml-1">❤️</span>
                      <span className="ml-1">248</span>
                    </div>
                    <div>12 comments • 4 reposts</div>
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
                  <div className="font-semibold text-sm">Unicode Preview</div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Live • Paste-ready for LinkedIn</span>
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
                <div className="mt-2 text-[11px] text-zinc-500 text-center">Converts **bold** → 𝗯𝗼𝗹𝗱, *italic* → 𝘪𝘵𝘢𝘭𝘪𝘤, bullets → •</div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">How it works</div>
                <ul className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200 list-disc pl-4">
                  <li>LinkedIn doesn't support Markdown — we convert to Unicode Mathematical Sans-Serif.</li>
                  <li>Formatting survives paste: bold, italic, bullets, arrows.</li>
                  <li>Character count stays identical for LinkedIn limits.</li>
                </ul>
              </div>
            </div>
          )}

          {tab==="card" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Image Card • Export</div>
                <button onClick={()=>exportImage(cardRef)} className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">⬇ Download PNG</button>
              </div>
              <div className="flex justify-center">
                <div ref={cardRef} className="w-full max-w-[560px] rounded-[20px] p-6 md:p-8" style={{background: gradient.bg, color: gradient.text}}>
                  <div className="flex items-center gap-2 text-xs opacity-80">
                    <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20">AI-Byte Series #Day24</span>
                    <span className="ml-auto">linkedin.com/in/you</span>
                  </div>
                  <div className="mt-6 text-[28px] md:text-[32px] font-bold leading-tight" style={{fontFamily:"'Source Serif 4', serif"}}>{cardTitle}</div>
                  {thought && <div className="mt-4 text-sm leading-6 p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur">“{thought}”</div>}
                  <div className="mt-6 whitespace-pre-wrap text-[14px] leading-6 opacity-95">{content.slice(0,420)}{content.length>420?"…":""}</div>
                  <div className="mt-8 flex items-center gap-3 pt-6 border-t border-white/15">
                    <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30"/>
                    <div>
                      <div className="font-semibold text-sm leading-none">{name}</div>
                      <div className="text-xs opacity-80">{headline}</div>
                    </div>
                    <div className="ml-auto text-xs px-3 py-1.5 rounded-full bg-white text-zinc-900 font-semibold">Follow me</div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-500 text-center">Inspired by satyadileep.github.io/apps/linkedin-card.html — now with gradients, export, and open-source love.</div>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0A66C2] grid place-items-center text-white text-xs">✦</div>
            <div className="text-xs">
              <div className="font-semibold">Crafted for Netlify • Zero backend • 100% client-side</div>
              <div className="text-zinc-500 dark:text-zinc-400">Deploy in 30 seconds. Fork, star, brag. Built with Vite + Tailwind + html-to-image.</div>
            </div>
            <a href="https://app.netlify.com/start/deploy" target="_blank" className="ml-auto hidden sm:inline-flex text-xs font-semibold px-4 py-2 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">Deploy →</a>
          </div>
        </div>
      </main>

      <footer className="max-w-[1280px] mx-auto px-4 pb-8 text-center text-xs text-zinc-500">
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
          Open Source • MIT • Made with ♥ for LinkedIn creators • <a href={linkedinUrl} target="_blank" className="underline">satya-dileep</a> • #ContentCrafter
        </div>
      </footer>
    </div>
  )
}
