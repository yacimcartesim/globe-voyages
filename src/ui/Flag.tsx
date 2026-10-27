import { flagUrl } from '../data/flags'

/** Petit drapeau arrondi avec un liseré discret (comme dans les apps Apple) */
export function Flag({ code, size = 28, radius = 4 }: { code: string; size?: number; radius?: number }) {
  const url = flagUrl(code)
  return (
    <span
      className="inline-block shrink-0 overflow-hidden bg-fill shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.12)]"
      style={{ width: size, height: (size * 3) / 4, borderRadius: radius }}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />}
    </span>
  )
}
