import type { ReactNode } from 'react'

// Affichage d'un texte riche simple (Markdown léger), sans jamais injecter de HTML :
//   # Titre / ## Sous-titre
//   - élément de liste (ou *)
//   1. liste numérotée
//   **gras**, [texte du lien](https://…), et les adresses https://… deviennent des liens

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+)/g

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    const url = link?.[2] ?? (/^https?:\/\//.test(part) ? part : null)
    if (url) {
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-blue underline-offset-2 active:underline">
          {link?.[1] ?? part.replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      )
    }
    return part
  })
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag key={blocks.length} className={`my-1 space-y-1 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'} marker:text-label-3`}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    )
    list = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      const ordered = !!numbered
      if (list && list.ordered !== ordered) flush()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1])
      continue
    }
    flush()
    if (!line.trim()) continue
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      blocks.push(
        <p key={blocks.length} className={heading[1].length === 1 ? 'text-headline mt-3 first:mt-0' : 'text-subhead mt-2 font-semibold first:mt-0'}>
          {inline(heading[2])}
        </p>,
      )
    } else {
      blocks.push(
        <p key={blocks.length} className="my-1">
          {inline(line)}
        </p>,
      )
    }
  }
  flush()

  return <div className="text-body select-text">{blocks}</div>
}
