import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

// État d'interface partagé : quelle fiche est ouverte (pays, voyage, création…).
// Permet d'ouvrir une fiche depuis n'importe quel écran.

type UI = {
  countryCode: string | null
  openCountry: (code: string) => void
  closeCountry: () => void

  tripId: string | null
  openTrip: (id: string) => void
  closeTrip: () => void

  /** Formulaire de création de voyage (avec pays pré-sélectionnés éventuels) */
  newTrip: { countries: string[] } | null
  startNewTrip: (countries?: string[]) => void
  closeNewTrip: () => void
}

const Ctx = createContext<UI | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [tripId, setTripId] = useState<string | null>(null)
  const [newTrip, setNewTrip] = useState<{ countries: string[] } | null>(null)

  const value = useMemo<UI>(
    () => ({
      countryCode,
      openCountry: setCountryCode,
      closeCountry: () => setCountryCode(null),
      tripId,
      openTrip: (id) => {
        // Le voyage s'ouvre par-dessus tout : on ferme la fiche pays éventuelle
        setCountryCode(null)
        setTripId(id)
      },
      closeTrip: () => setTripId(null),
      newTrip,
      startNewTrip: (countries = []) => setNewTrip({ countries }),
      closeNewTrip: () => setNewTrip(null),
    }),
    [countryCode, tripId, newTrip],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI() {
  const ui = useContext(Ctx)
  if (!ui) throw new Error('useUI doit être utilisé dans UIProvider')
  return ui
}
