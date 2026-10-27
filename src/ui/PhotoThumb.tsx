import { MapPin } from 'lucide-react'
import { usePhotoUrl } from '../db/photos'
import type { Photo } from '../db/schema'

/** Miniature carrée d'une photo (avec un petit repère si elle est géolocalisée) */
export function PhotoThumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const url = usePhotoUrl(photo, 'thumb')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={photo.caption || 'Photo'}
      className="relative aspect-square overflow-hidden bg-fill active:opacity-80"
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />}
      {photo.coords && (
        <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur">
          <MapPin size={11} strokeWidth={2.4} />
        </span>
      )}
    </button>
  )
}
