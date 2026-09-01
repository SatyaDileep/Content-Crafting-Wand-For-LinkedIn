export function getMetadata(text: string) {
  const chars = [...text].length
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const lines = text === "" ? 0 : text.split("\n").length
  const hashtags = (text.match(/#\w+/g) || []).length
  const readingSec = Math.ceil((words / 200) * 60)
  const readingLabel = readingSec < 60 ? `${readingSec} sec` : `${Math.ceil(readingSec / 60)} min`
  return { chars, words, lines, hashtags, readingSec, readingLabel }
}
