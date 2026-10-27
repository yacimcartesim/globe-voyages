import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// État d'interface partagé : quelle fiche est ouverte (pays, ajout…).
// Permet d'ouvrir la fiche d'un pays depuis n'importe quel écran.

type UI = {
  countryCode: string | null
  openCountry: (code: string) => void
  closeCountry: () => void
}

const Ctx = createContext<UI | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const value = useMemo(
    () => ({ countryCode, openCountry: setCountryCode, closeCountry: () => setCountryCode(null) }),
    [countryCode],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI() {
  const ui = useContext(Ctx)
  if (!ui) throw new Error('useUI doit être utilisé dans UIProvider')
  return ui
}
