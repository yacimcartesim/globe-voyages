import { useMemo, useRef, useState } from 'react'
import { Camera, ChevronDown, ImagePlus, Info } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button, EmptyState, ProgressBar } from '../../ui/controls'
import { PhotoThumb } from '../../ui/PhotoThumb'
import { PhotoViewer } from './PhotoViewer'
import { importPhotos, usePhotos, type ImportReport } from '../../db/photos'
import { dateOfDay, formatDay, useStops } from '../../db/trips'
import { usePreference } from '../../hooks/usePreference'
import type { Photo, Stop, Trip } from '../../db/schema'

type Group = { key: string; title: string; subtitle?: string; photos: Photo[] }

/** Regroupe les photos par étape (dans l'ordre de l'itinéraire), puis les photos à classer */
function groupPhotos(photos: Photo[], stops: Stop[], trip: Trip): Group[] {
  const groups: Group[] = stops
    .map((s) => {
      const date = s.date ?? dateOfDay(trip.start, s.day)
      return {
        key: s.id,
        title: s.name,
        subtitle: s.day ? `Jour ${s.day}${date ? ` · ${formatDay(date)}` : ''}` : undefined,
        photos: photos.filter((p) => p.stopId === s.id),
      }
    })
    .filter((g) => g.photos.length > 0)
  const unassigned = photos.filter((p) => !p.stopId || !stops.some((s) => s.id === p.stopId))
  if (unassigned.length) {
    groups.push({ key: 'inbox', title: 'À classer', subtitle: 'Touche une photo puis « ⋯ » pour la rattacher à une étape', photos: unassigned })
  }
  return groups
}

/** Onglet « Photos » : import multiple, galerie par étape, visionneuse plein écran */
export function PhotosTab({ trip }: { trip: Trip }) {
  const photos = usePhotos(trip.id) ?? []
  const stops = useStops(trip.id) ?? []
  const [maxKm] = usePreference('photoMatchKm', 30)
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const groups = useMemo(() => groupPhotos(photos, stops, trip), [photos, stops, trip])
  // Ordre de la visionneuse = ordre d'affichage de la galerie
  const ordered = useMemo(() => groups.flatMap((g) => g.photos), [groups])

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    setReport(null)
    setProgress({ done: 0, total: list.length })
    const r = await importPhotos(trip.id, list, stops, maxKm, (done) => setProgress({ done, total: list.length }))
    setProgress(null)
    setReport(r)
    // Aucune position trouvée : on affiche l'aide iPhone
    if (r.withGps === 0 && r.total - r.failed > 0) setHelpOpen(true)
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="photo-input"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="mx-4 mb-3">
        {progress ? (
          <div className="rounded-[22px] bg-elevated p-4">
            <p className="text-subhead mb-2 text-label-2">
              Import en cours… {progress.done} / {progress.total}
            </p>
            <ProgressBar value={progress.done / progress.total} />
          </div>
        ) : (
          <Button size="lg" variant="tinted" icon={ImagePlus} onClick={() => input.current?.click()}>
            Importer des photos
          </Button>
        )}
      </div>

      {report && (
        <p className="text-footnote mx-8 mb-3 text-label-2" role="status">
          {report.total - report.failed} photo{report.total - report.failed > 1 ? 's' : ''} importée{report.total - report.failed > 1 ? 's' : ''}
          {report.matched > 0 && ` · ${report.matched} rattachée${report.matched > 1 ? 's' : ''} automatiquement à une étape`}
          {report.total - report.failed - report.matched > 0 && ` · ${report.total - report.failed - report.matched} à classer`}
          {report.failed > 0 && ` · ${report.failed} illisible${report.failed > 1 ? 's' : ''}`}
        </p>
      )}

      {/* Aide : positions GPS supprimées par l'iPhone */}
      <div className="mx-4 mb-5 overflow-hidden rounded-[22px] bg-elevated">
        <button type="button" onClick={() => setHelpOpen((v) => !v)} className="flex min-h-11 w-full items-center gap-3 px-4 text-left" aria-expanded={helpOpen}>
          <Info size={18} className="shrink-0 text-blue" />
          <span className="text-subhead flex-1">Les photos n’ont pas de position ?</span>
          <ChevronDown size={18} className={`text-label-3 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence initial={false}>
          {helpOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="text-subhead space-y-2 px-4 pb-4 text-label-2">
                <p>
                  Les photos géolocalisées sont rattachées automatiquement à l’étape la plus proche (à moins de {maxKm} km, réglable dans
                  Réglages). Mais en choisissant des photos dans la <strong>Photothèque</strong>, Safari retire souvent leur position.
                </p>
                <p className="font-medium text-label">Pour la conserver :</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>Dans l’app Photos, sélectionne les photos puis Partager → <strong>Enregistrer dans Fichiers</strong>.</li>
                  <li>
                    Ici, touche « Importer des photos » puis <strong>Choisir un fichier</strong> (et non « Photothèque ») et prends-les dans
                    Fichiers.
                  </li>
                </ol>
                <p>Sinon, pas de souci : ouvre une photo et rattache-la à une étape avec le menu « ⋯ ».</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {photos.length === 0 && !progress ? (
        <EmptyState icon={Camera} title="Aucune photo" text="Importe les photos de ce voyage : elles seront classées par étape et visibles sur la carte." />
      ) : (
        groups.map((g) => (
          <section key={g.key} className="mb-6">
            <div className="mx-8 mb-1.5">
              <h3 className="text-headline">{g.title}</h3>
              {g.subtitle && <p className="text-footnote text-label-2">{g.subtitle}</p>}
            </div>
            <div className="mx-4 grid grid-cols-3 gap-0.5 overflow-hidden rounded-[18px]">
              {g.photos.map((p) => (
                <PhotoThumb key={p.id} photo={p} onClick={() => setViewerIndex(ordered.indexOf(p))} />
              ))}
            </div>
          </section>
        ))
      )}

      <PhotoViewer trip={trip} photos={ordered} stops={stops} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </div>
  )
}
