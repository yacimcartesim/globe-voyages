import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Printer, X } from 'lucide-react'
import { Markdown } from '../ui/Markdown'
import { renderStaticMap } from './staticMap'
import { PRACTICAL } from '../screens/trip/PracticalTab'
import { placeName } from '../data/places'
import { flagUrl } from '../data/flags'
import { stopType, transport } from '../data/stopTypes'
import { CATEGORIES, useExpenses } from '../db/expenses'
import { photoBlob, usePhotos } from '../db/photos'
import { dateOfDay, formatDay, formatRange, tripLength, useStops } from '../db/trips'
import { formatMoney, round2 } from '../services/currency'
import type { Photo, Trip } from '../db/schema'
import './print.css'

/** Sélection de photos pour le guide : la couverture puis des photos réparties sur tout le voyage */
function pickPhotos(photos: Photo[], coverId: string | undefined, max = 12): Photo[] {
  const cover = photos.find((p) => p.id === coverId)
  const others = photos.filter((p) => p !== cover)
  const n = max - (cover ? 1 : 0)
  const step = others.length / n
  const picked = others.length <= n ? others : Array.from({ length: n }, (_, i) => others[Math.floor(i * step)])
  return cover ? [cover, ...picked] : picked
}

/**
 * Guide imprimable d'un voyage (affiché en plein écran, puis Imprimer → PDF) :
 * couverture, carte, étapes jour par jour, infos pratiques, budget, sélection de photos.
 */
export function TripGuide({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const stops = useStops(trip.id)
  const photos = usePhotos(trip.id)
  const expenses = useExpenses(trip.id)
  const [mapImage, setMapImage] = useState<string | null | undefined>(undefined)
  const days = tripLength(trip)

  // Image de la carte, générée une fois les étapes chargées
  const stopsKey = stops?.map((s) => s.id + (s.route?.length ?? 0)).join()
  useEffect(() => {
    if (!stops) return
    let cancelled = false
    renderStaticMap(stops).then((img) => !cancelled && setMapImage(img))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey])

  // Adresses temporaires des photos choisies
  const selection = useMemo(() => pickPhotos(photos ?? [], trip.coverPhotoId), [photos, trip.coverPhotoId])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  useEffect(() => {
    const m = new Map(selection.map((p) => [p.id, URL.createObjectURL(photoBlob(p, 'image'))]))
    setUrls(m)
    return () => m.forEach((u) => URL.revokeObjectURL(u))
  }, [selection])

  // Pendant l'affichage du guide, seule cette page est imprimée
  useEffect(() => {
    document.documentElement.classList.add('printing-guide')
    return () => document.documentElement.classList.remove('printing-guide')
  }, [])

  const ready = stops !== undefined && photos !== undefined && expenses !== undefined && mapImage !== undefined
  const total = round2((expenses ?? []).reduce((s, e) => s + e.amountEUR, 0))
  const byCategory = CATEGORIES.map((c) => ({ ...c, total: round2((expenses ?? []).filter((e) => e.category === c.value).reduce((s, e) => s + e.amountEUR, 0)) })).filter((c) => c.total > 0)
  const coverUrl = trip.coverPhotoId ? urls.get(trip.coverPhotoId) : undefined
  const practical = PRACTICAL.filter((p) => trip.practical[p.id]?.trim())

  return createPortal(
    <div className="guide-overlay fixed inset-0 z-[60] overflow-y-auto bg-[#e5e5ea]" role="dialog" aria-modal="true" aria-label={`Guide : ${trip.title}`}>
      {/* Barre d'outils (non imprimée) */}
      <div
        className="no-print glass sticky top-0 z-10 flex items-center justify-between px-4 pb-2"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <button type="button" onClick={onClose} aria-label="Fermer le guide" className="flex size-11 items-center justify-center rounded-full text-label">
          <X size={22} />
        </button>
        <span className="text-headline">Guide du voyage</span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!ready}
          className="flex min-h-11 items-center gap-1.5 rounded-full bg-blue px-4 text-[15px] font-semibold text-white disabled:opacity-40"
        >
          {ready ? <Printer size={17} /> : <Loader2 size={17} className="animate-spin" />}
          PDF
        </button>
      </div>
      <p className="no-print text-footnote mx-auto max-w-[210mm] px-6 pt-3 text-center text-label-2">
        iPhone : touche « PDF » (ou Partager → Imprimer), puis Partager dans l’aperçu pour enregistrer le PDF. Mac : « PDF » → Enregistrer au
        format PDF.
      </p>

      <article className="guide">
        {/* Couverture */}
        <section className="guide-cover">
          {coverUrl ? <img src={coverUrl} alt="" className="guide-cover-img" /> : <div className="guide-cover-img guide-cover-fallback" />}
          <div className="guide-flags">
            {trip.countries.map((c) => (
              <img key={c} src={flagUrl(c)} alt="" />
            ))}
          </div>
          <h1>{trip.title}</h1>
          <p className="guide-sub">
            {formatRange(trip.start, trip.end)}
            {days ? ` · ${days} jours` : ''}
          </p>
          <p className="guide-meta">{trip.countries.map(placeName).join(' · ')}</p>
          {trip.companions && <p className="guide-meta">Avec {trip.companions}</p>}
        </section>

        {/* Itinéraire */}
        {stops && stops.length > 0 && (
          <section className="guide-section guide-page">
            <h2>Itinéraire</h2>
            {mapImage && <img src={mapImage} alt="Carte de l’itinéraire" className="guide-map" />}
            <ol className="guide-stops">
              {stops.map((s, i) => {
                const t = stopType(s.type)
                const tr = i > 0 ? transport(s.transport) : undefined
                const date = s.date ?? dateOfDay(trip.start, s.day)
                const newDay = i === 0 || stops[i - 1].day !== s.day
                return (
                  <li key={s.id}>
                    {newDay && s.day && <p className="guide-day">Jour {s.day}{date ? ` · ${formatDay(date)}` : ''}</p>}
                    <div className="guide-stop">
                      <span className="guide-num" data-type={s.type}>
                        {i + 1}
                      </span>
                      <div>
                        <p className="guide-stop-name">{s.name}</p>
                        <p className="guide-stop-meta">{[t.label, tr && `en ${tr.label.toLowerCase()}`, s.lodging && `Logement : ${s.lodging}`].filter(Boolean).join(' · ')}</p>
                        {s.notes && <p className="guide-stop-notes">{s.notes}</p>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* Infos pratiques */}
        {practical.length > 0 && (
          <section className="guide-section guide-page">
            <h2>Infos pratiques</h2>
            {practical.map((p) => (
              <div key={p.id} className="guide-practical">
                <h3>{p.title}</h3>
                <Markdown text={trip.practical[p.id]!} />
              </div>
            ))}
          </section>
        )}

        {/* Budget */}
        {expenses && expenses.length > 0 && (
          <section className="guide-section guide-page">
            <h2>Budget</h2>
            <p className="guide-total">{formatMoney(total)}</p>
            <p className="guide-sub">
              {days ? `${formatMoney(total / days, 'EUR', true)} par jour · ` : ''}
              {expenses.length} dépenses
            </p>
            <table className="guide-table">
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.value}>
                    <td>
                      <span className="guide-dot" data-cat={c.value} />
                      {c.label}
                    </td>
                    <td>{formatMoney(c.total)}</td>
                    <td>{Math.round((c.total / total) * 100)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Photos */}
        {selection.length > 0 && (
          <section className="guide-section guide-page">
            <h2>Photos</h2>
            <div className="guide-photos">
              {selection.map((p) => (
                <figure key={p.id}>
                  {urls.get(p.id) && <img src={urls.get(p.id)} alt={p.caption ?? ''} />}
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>,
    document.body,
  )
}
