import { Luggage } from 'lucide-react'
import { Screen } from '../ui/Screen'
import { EmptyState } from '../ui/controls'

export function TripsScreen() {
  return (
    <Screen title="Voyages" tabId="trips">
      <EmptyState
        icon={Luggage}
        title="Aucun voyage"
        text="Tes voyages apparaîtront ici, avec leur itinéraire, leurs photos, tes conseils et ton budget."
      />
    </Screen>
  )
}
