import { Search, XCircle } from 'lucide-react'

/** Champ de recherche iOS : fond gris, loupe, bouton d'effacement */
export function SearchField({
  value,
  onChange,
  placeholder = 'Rechercher',
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  return (
    <label className="flex h-11 items-center gap-1.5 rounded-full bg-fill px-3 text-label-2">
      <Search size={18} strokeWidth={2.2} className="shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent text-[17px] text-label outline-none placeholder:text-label-2 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" aria-label="Effacer" onClick={() => onChange('')} className="-mr-1 flex size-8 items-center justify-center">
          <XCircle size={18} className="fill-label-3 text-elevated" />
        </button>
      )}
    </label>
  )
}
