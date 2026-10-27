import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/controls'
import { Flag } from '../ui/Flag'
import { SearchField } from '../ui/SearchField'
import { normalize, PLACES, placeSubtitle } from '../data/places'

type Props = {
  open: boolean
  onClose: () => void
  /** Codes déjà visités (affichés avec une coche) */
  visited: Set<string>
  onPick: (code: string) => void
}

/** Recherche d'un pays ou territoire à ajouter, avec autocomplétion en français */
export function AddCountrySheet({ open, onClose, visited, onPick }: Props) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = normalize(query)
    if (!q) return PLACES
    // Les noms qui commencent par la recherche d'abord, puis ceux qui la contiennent
    const starts = PLACES.filter((p) => normalize(p.name).startsWith(q))
    const contains = PLACES.filter((p) => !normalize(p.name).startsWith(q) && normalize(p.name).includes(q))
    return [...starts, ...contains]
  }, [query])

  const close = () => {
    onClose()
    setQuery('')
  }

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="Ajouter un pays"
      leading={
        <Button variant="plain" onClick={close}>
          Annuler
        </Button>
      }
    >
      <div className="sticky top-0 z-10 bg-grouped px-4 pt-1 pb-3">
        <SearchField value={query} onChange={setQuery} placeholder="Pays ou territoire" />
      </div>

      {results.length === 0 ? (
        <p className="text-body px-8 pt-10 text-center text-label-2">Aucun résultat pour « {query} »</p>
      ) : (
        <ul className="mx-4 overflow-hidden rounded-[22px] bg-elevated">
          {results.map((p) => {
            const done = visited.has(p.code)
            return (
              <li key={p.code}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(p.code)
                    setQuery('')
                  }}
                  className="flex w-full items-center gap-3 pl-4 text-left active:bg-fill"
                >
                  <Flag code={p.code} size={30} />
                  <span className="flex min-h-14 flex-1 items-center gap-2 border-b-[0.5px] border-separator py-2 pr-4 [li:last-child_&]:border-b-0">
                    <span className="flex-1">
                      <span className="text-body block">{p.name}</span>
                      <span className="text-footnote block text-label-2">{placeSubtitle(p.code)}</span>
                    </span>
                    {done && <Check size={20} strokeWidth={2.4} className="text-blue" />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}
