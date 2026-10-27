import { Star } from 'lucide-react'
import { Screen } from '../ui/Screen'
import { EmptyState } from '../ui/controls'

export function WishlistScreen() {
  return (
    <Screen title="Wishlist" tabId="wishlist">
      <EmptyState
        icon={Star}
        title="Rien pour l'instant"
        text="Ajoute les pays et les lieux qui te font rêver. Ils apparaîtront en bleu pâle sur le globe."
      />
    </Screen>
  )
}
