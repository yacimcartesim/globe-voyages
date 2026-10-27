import { useState } from 'react'
import { ChartPie, Earth, Luggage, Star } from 'lucide-react'
import { TabBar, type Tab } from './ui/TabBar'
import { GlobeScreen } from './screens/GlobeScreen'
import { TripsScreen } from './screens/TripsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { WishlistScreen } from './screens/WishlistScreen'
import { SettingsSheet } from './screens/SettingsSheet'
import { CountrySheet } from './screens/CountrySheet'
import { useCountryEntries } from './db/countries'
import { UIProvider, useUI } from './state/ui'
import { TripSheet } from './screens/trip/TripSheet'
import { TripFormSheet } from './screens/TripFormSheet'

type TabId = 'globe' | 'trips' | 'stats' | 'wishlist'

const TABS: Tab<TabId>[] = [
  { id: 'globe', label: 'Globe', icon: Earth },
  { id: 'trips', label: 'Voyages', icon: Luggage },
  { id: 'stats', label: 'Statistiques', icon: ChartPie },
  { id: 'wishlist', label: 'Wishlist', icon: Star },
]

export default function App() {
  const [tab, setTab] = useState<TabId>('globe')
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Pays marqués, lus en direct depuis la base locale
  const entries = useCountryEntries() ?? []

  return (
    <UIProvider>
      <div className="relative h-full overflow-hidden bg-grouped">
        {/* Tous les écrans restent montés (le globe ne se recharge pas, le défilement est conservé) */}
        <main className="absolute inset-0">
          <div className="absolute inset-0" hidden={tab !== 'globe'}>
            <GlobeScreen entries={entries} active={tab === 'globe'} onOpenSettings={() => setSettingsOpen(true)} />
          </div>
          <div className="absolute inset-0" hidden={tab !== 'trips'}>
            <TripsScreen />
          </div>
          <div className="absolute inset-0" hidden={tab !== 'stats'}>
            <StatsScreen entries={entries} />
          </div>
          <div className="absolute inset-0" hidden={tab !== 'wishlist'}>
            <WishlistScreen />
          </div>
        </main>

        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <CountrySheet entries={entries} />
        <TripSheet />
        <NewTrip />
      </div>
    </UIProvider>
  )
}

/** Formulaire « Nouveau voyage », ouvrable depuis n'importe quel écran ; ouvre le voyage une fois créé */
function NewTrip() {
  const { newTrip, closeNewTrip, openTrip } = useUI()
  return (
    <TripFormSheet
      open={!!newTrip}
      onClose={closeNewTrip}
      initialCountries={newTrip?.countries}
      onCreated={openTrip}
    />
  )
}
