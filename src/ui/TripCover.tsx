import { flagUrl } from '../data/flags'

/**
 * Fond d'en-tête d'un voyage : la photo de couverture (phase 4) ou, à défaut,
 * le drapeau du premier pays, très flouté, pour une couleur d'ambiance.
 */
export function TripCover({ countries, coverUrl }: { countries: string[]; coverUrl?: string }) {
  const flag = countries[0] ? flagUrl(countries[0]) : undefined
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-blue to-indigo">
      {coverUrl ? (
        <img src={coverUrl} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        flag && (
          <img
            src={flag}
            alt=""
            className="h-full w-full scale-150 object-cover opacity-90 blur-2xl saturate-150"
            draggable={false}
          />
        )
      )}
      {/* Dégradé pour que le texte blanc reste lisible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
    </div>
  )
}
