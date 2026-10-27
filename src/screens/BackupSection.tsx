import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button, ProgressBar } from '../ui/controls'
import { db } from '../db/db'
import {
  BackupError,
  createBackup,
  markBackupDone,
  readBackup,
  restoreBackup,
  shareBackup,
  type ParsedBackup,
} from '../services/backup'

const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** « il y a 3 jours », « aujourd'hui » */
export function sinceLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

/** Section « Sauvegarde » des Réglages : export ZIP et import avec aperçu */
export function BackupSection() {
  const last = useLiveQuery(async () => (await db.meta.get('lastBackup'))?.value as { at: string } | undefined, [])
  const [exporting, setExporting] = useState<number | null>(null)
  const [message, setMessage] = useState<string>()
  const input = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedBackup | null>(null)

  const exportNow = async () => {
    setMessage(undefined)
    setExporting(0)
    try {
      const file = await createBackup((p) => setExporting(p))
      const outcome = await shareBackup(file)
      if (outcome === 'cancelled') setMessage('Sauvegarde annulée.')
      else {
        await markBackupDone()
        setMessage(
          outcome === 'shared'
            ? `Sauvegarde envoyée (${(file.size / 1_048_576).toFixed(1).replace('.', ',')} Mo).`
            : `Fichier ${file.name} téléchargé (${(file.size / 1_048_576).toFixed(1).replace('.', ',')} Mo).`,
        )
      }
    } catch {
      setMessage('La sauvegarde a échoué. Réessaie, ou libère un peu d’espace sur l’appareil.')
    } finally {
      setExporting(null)
    }
  }

  const onFile = async (file?: File) => {
    if (input.current) input.current.value = ''
    if (!file) return
    setMessage(undefined)
    try {
      setParsed(await readBackup(file))
    } catch (e) {
      setMessage(e instanceof BackupError ? e.message : 'Impossible de lire ce fichier.')
    }
  }

  return (
    <>
      <Section
        header="Sauvegarde"
        footer={
          message ??
          `Tes données restent uniquement sur cet appareil. ${
            last ? `Dernière sauvegarde ${sinceLabel(last.at)}.` : 'Aucune sauvegarde pour l’instant.'
          } Sur iPhone, choisis « Enregistrer dans Fichiers » → iCloud Drive. Le même fichier permet de transférer tes données vers le Mac.`
        }
      >
        {exporting !== null ? (
          <div className="px-4 py-3">
            <p className="text-subhead mb-2 text-label-2">Préparation de la sauvegarde… {Math.round(exporting * 100)} %</p>
            <ProgressBar value={exporting} />
          </div>
        ) : (
          <Row icon={Upload} iconColor="var(--blue)" label="Exporter une sauvegarde" chevron onClick={exportNow} />
        )}
        <Row icon={Download} iconColor="var(--green)" label="Importer une sauvegarde" chevron onClick={() => input.current?.click()} />
      </Section>
      <input
        ref={input}
        type="file"
        accept=".zip,application/zip"
        hidden
        data-testid="backup-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <ImportSheet parsed={parsed} onClose={() => setParsed(null)} onDone={(msg) => setMessage(msg)} />
    </>
  )
}

/** Aperçu d'une sauvegarde et choix fusionner / remplacer */
function ImportSheet({ parsed, onClose, onDone }: { parsed: ParsedBackup | null; onClose: () => void; onDone: (msg: string) => void }) {
  const [progress, setProgress] = useState<number | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const s = parsed?.summary

  const run = async (mode: 'merge' | 'replace') => {
    if (!parsed) return
    if (mode === 'replace' && !confirmReplace) return setConfirmReplace(true)
    setProgress(0)
    try {
      await restoreBackup(parsed, mode, setProgress)
      onDone(mode === 'merge' ? 'Sauvegarde fusionnée avec tes données.' : 'Tes données ont été remplacées par la sauvegarde.')
      close()
    } catch {
      onDone('L’import a échoué : aucune donnée n’a été modifiée.')
      close()
    }
  }

  const close = () => {
    setProgress(null)
    setConfirmReplace(false)
    onClose()
  }

  const rows: [string, number | undefined][] = [
    ['Pays et territoires visités', s?.countries],
    ['Voyages', s?.trips],
    ['Étapes', s?.stops],
    ['Photos', s?.photos],
    ['Dépenses', s?.expenses],
    ['Notes à classer', s?.notes],
    ['Envies (wishlist)', s?.wishPlaces],
  ]

  return (
    <BottomSheet
      open={!!parsed}
      onClose={progress === null ? close : () => {}}
      title="Importer une sauvegarde"
      leading={
        progress === null && (
          <Button variant="plain" onClick={close}>
            Annuler
          </Button>
        )
      }
    >
      {parsed && (
        <div className="pt-4">
          <Section header={`Sauvegarde du ${fmt.format(new Date(parsed.data.exportedAt))}`}>
            {rows.map(([label, n]) => (
              <Row key={label} label={label} detail={n ?? 0} />
            ))}
          </Section>

          {progress !== null ? (
            <div className="mx-4 rounded-[22px] bg-elevated p-4">
              <p className="text-subhead mb-2 text-label-2">Restauration… {Math.round(progress * 100)} %</p>
              <ProgressBar value={progress} />
            </div>
          ) : (
            <div className="mx-4 flex flex-col gap-3">
              <Button size="lg" onClick={() => run('merge')}>
                Fusionner avec mes données
              </Button>
              <p className="text-footnote -mt-1 px-2 text-label-2">
                Ajoute le contenu de la sauvegarde sans rien effacer. Idéal pour transférer de l’iPhone vers le Mac.
              </p>
              <Button size="lg" variant="tinted" className={confirmReplace ? '!bg-red !text-white' : '!bg-red/12 !text-red'} onClick={() => run('replace')}>
                {confirmReplace ? 'Confirmer : tout remplacer' : 'Remplacer mes données'}
              </Button>
              <p className="text-footnote -mt-1 px-2 text-label-2">
                Efface tout ce qui est sur cet appareil puis restaure la sauvegarde. Pense à exporter avant si besoin.
              </p>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
