import { useEffect, useMemo, useRef, useState } from "react"
import { markdownToHtml } from "../lib/unicode"

const MAX_SLIDES = 10
const MAX_FILE_MB = 6
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"]
const PDF_TYPE = "application/pdf"
const ACCEPT = "image/png,image/jpeg,image/webp,application/pdf"

type Slide = {
  id: string
  name: string
  dataUrl: string
  w: number
  h: number
}

let uid = 0
const nextId = () => `slide-${++uid}`

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error(`Could not read ${file.name}`))
    r.readAsDataURL(file)
  })
}

function imageDims(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => reject(new Error("Could not read image dimensions"))
    img.src = src
  })
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null
function getPdfjs() {
  pdfjsPromise ??= (async () => {
    const pdfjs = await import("pdfjs-dist")
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })()
  return pdfjsPromise
}

async function pdfToSlides(file: File, remaining: number): Promise<Slide[]> {
  const pdfjs = await getPdfjs()
  const buf = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const count = Math.min(doc.numPages, remaining)
  const out: Slide[] = []
  const MAX = 1400
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(MAX / base.width, (MAX * 1.4) / base.height, 1.6)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement("canvas")
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) continue
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport } as never).promise
    out.push({
      id: nextId(),
      name: `${file.name} · page ${i}`,
      dataUrl: canvas.toDataURL("image/jpeg", 0.85),
      w: canvas.width,
      h: canvas.height,
    })
  }
  await (doc as any).destroy?.()
  return out
}

type Props = {
  content: string
  name: string
  headline: string
  avatar: string
  linkedinUrl: string
}

export default function Carousel({ content, name, headline, avatar, linkedinUrl }: Props) {
  const [slides, setSlides] = useState<Slide[]>([])
  const [index, setIndex] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const postHtml = useMemo(() => markdownToHtml(content || "Your caption will appear here…"), [content])

  const visibleCount = 2
  const maxIndex = Math.max(0, slides.length - visibleCount)
  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex)
  }, [slides.length, index, maxIndex])

  const remaining = MAX_SLIDES - slides.length

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError("")
    for (const f of Array.from(files)) {
      if (remaining <= 0) { setError(`Maximum ${MAX_SLIDES} slides reached — remove some to keep uploading.`); break }
      if (f.size > MAX_FILE_BYTES) { setError(`${f.name} is larger than ${MAX_FILE_MB} MB — compress and retry.`); continue }
      try {
        if (f.type === PDF_TYPE) {
          setBusy(true)
          const pages = await pdfToSlides(f, remaining)
          if (pages.length === 0) setError(`No pages could be read from ${f.name}.`)
          else setSlides(prev => [...prev, ...pages].slice(0, MAX_SLIDES))
        } else if (IMAGE_TYPES.includes(f.type)) {
          const dataUrl = await fileToDataUrl(f)
          const { w, h } = await imageDims(dataUrl)
          setSlides(prev => [...prev, { id: nextId(), name: f.name, dataUrl, w, h }].slice(0, MAX_SLIDES))
        } else {
          setError(`${f.name}: only PNG, JPG, WebP, or a single PDF are supported.`)
        }
      } catch (e: any) {
        setError(e?.message || `Could not read ${f.name}.`)
      } finally {
        setBusy(false)
      }
    }
  }

  function removeSlide(id: string) {
    setSlides(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#0A66C2]" />
        <div>
          <div className="text-sm font-bold text-gray-800 dark:text-zinc-200">Document Preview — see it before you post</div>
          <div className="text-[11px] text-gray-500 dark:text-zinc-400">Write your post, attach your PDF, visualize exactly how LinkedIn will show it {slides.length > 0 && <span className="text-gray-400">· {slides.length} slide{slides.length > 1 ? "s" : ""}</span>}</div>
        </div>
      </div>

      {/* Dropzone */}
      {remaining > 0 && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-white/60 dark:bg-zinc-900/50 backdrop-blur cursor-pointer hover:border-[#0A66C2] hover:bg-white/80 dark:hover:bg-zinc-900/70 transition px-4 py-5 text-center">
          <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = "" }} />
          {busy ? (
            <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Ripping PDF pages…</div>
          ) : (
            <>
              <div className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Drop images or a PDF here</div>
              <div className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
                PNG · JPG · WebP · PDF &nbsp;—&nbsp; up to {MAX_SLIDES} slides, {MAX_FILE_MB} MB per file
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">{error}</div>
      )}

      {/* Steps hint */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-zinc-400 flex-wrap">
        {["1 Write your post (left)", "2 Drop PDF / images", "3 Preview swipe — then post as document on LinkedIn"].map((step, i) => (
          <span key={step} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300 dark:text-zinc-600">→</span>}
            {step}
          </span>
        ))}
      </div>

      {/* Combined Post + Document preview — exactly how LinkedIn shows it */}
      <div className="rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm bg-white dark:bg-zinc-900 mx-auto max-w-[560px]">
        <div className="p-3 flex gap-3">
          <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold text-[13px] leading-tight text-gray-900 dark:text-zinc-100 truncate">{name || "Your Name"}</div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 leading-tight truncate">{headline || "Your headline"}</div>
                <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">now · 🌐</div>
              </div>
              <a href={linkedinUrl || "#"} target="_blank" className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full border border-[#0A66C2] text-[#0A66C2] text-[11px] font-semibold">+ Follow</a>
            </div>
          </div>
        </div>
        <div className="px-3 pb-2 text-[13px] leading-5 break-words text-gray-900 dark:text-zinc-100 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_br]:block [&_br]:h-1" dangerouslySetInnerHTML={{ __html: postHtml }} />
        <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/50 px-3 py-3">
          {slides.length > 0 ? (
            <div className="relative flex items-center gap-2">
              <button onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0} className="shrink-0 w-7 h-7 grid place-items-center rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-30 hover:bg-gray-50 text-xs">‹</button>
              <div className="flex-1 overflow-hidden">
                <div className="flex gap-2 transition-transform duration-300 ease-out" style={{ transform: `translateX(-${index * 120}px)` }}>
                  {slides.map((s, i) => (
                    <div key={s.id} className="relative shrink-0 w-[112px] h-[148px] rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm group">
                      <img src={s.dataUrl} alt={s.name} className="w-full h-full object-cover" />
                      <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/65 text-white">{i + 1}</span>
                      <button onClick={() => removeSlide(s.id)} className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white text-[10px] opacity-0 group-hover:opacity-100 hover:bg-red-500 transition">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setIndex(i => Math.min(maxIndex, i + 1))} disabled={index >= maxIndex} className="shrink-0 w-7 h-7 grid place-items-center rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 disabled:opacity-30 hover:bg-gray-50 text-xs">›</button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-4">
              <div className="w-10 h-12 rounded border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 grid place-items-center text-[10px] text-gray-400">PDF</div>
              <div>
                <div className="text-xs font-semibold text-gray-600 dark:text-zinc-300">No document yet</div>
                <div className="text-[11px] text-gray-400 dark:text-zinc-500">Drop a PDF to see how LinkedIn will show it</div>
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 border-t border-gray-100 dark:border-zinc-800 text-[11px]">
          {["👍 Like", "💬 Comment", "↗ Repost", "✉ Send"].map(lab => (
            <span key={lab} className="py-2 flex items-center justify-center gap-1 text-gray-500 dark:text-zinc-400 font-medium">{lab}</span>
          ))}
        </div>
      </div>
    </div>
  )
}