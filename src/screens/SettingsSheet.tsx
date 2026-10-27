import { useEffect, useState } from 'react'
import { Download, FlaskConical, MapPinned, HardDrive, Info, RotateCw, ShieldCheck, Upload } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button, Switch } from '../ui/controls'
import { usePreference } from '../hooks/usePreference'
import { clearDemo, loadDemo, useDemoLoaded } from '../db/demo'
import { formatBytes, getStorageInfo, isStandalone, isStoragePersisted, type StorageInfo } from '../services/storage'

type Props = { open: boolean; onClose: () => void }

export function SettingsSheet({ open, onClose }: Props) {
  const [autoRotate, setAutoRotate] = usePreference('autoRotate', true)
  const [photoMatchKm, setPhotoMatchKm] = usePreference('photoMatchKm', 30)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [persisted, setPersisted] = useState(false)
  const demoLoaded = useDemoLoaded()
  const [demoBusy, setDemoBusy] = useState(false)

  // Rafraîchit les infos de stockage à chaque ouverture
  useEffect(() => {
    if (!open) return
    getStorageInfo().then(setStorage)
    isStoragePersisted().then(setPersisted)
  }, [open])

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Réglages"
      trailing={
        <Button variant="plain" onClick={onClose}>
          OK
        </Button>
      }
    >
      <div className="pt-4">
        <Section header="Globe">
          <Row
            icon={RotateCw}
            iconColor="var(--indigo)"
            label="Rotation automatique"
            accessory={<Switch checked={autoRotate} onChange={setAutoRotate} label="Rotation automatique" />}
          />
        </Section>

        <Section header="Photos" footer="Une photo géolocalisée est rattachée à l’étape la plus proche si elle est à moins de cette distance.">
          <Row
            icon={MapPinned}
            iconColor="var(--red)"
            label="Rattachement automatique"
            accessory={
              <select
                aria-label="Distance de rattachement"
                value={photoMatchKm}
                onChange={(e) => setPhotoMatchKm(Number(e.target.value))}
                className="h-11 appearance-none bg-transparent text-right text-[17px] text-label-2 outline-none"
              >
                {[5, 10, 30, 50, 100].map((km) => (
                  <option key={km} value={km}>
                    {km} km
                  </option>
                ))}
              </select>
            }
          />
        </Section>

        <Section
          header="Sauvegarde"
          footer="Tes données restent uniquement sur cet appareil. Exporte régulièrement une sauvegarde vers iCloud Drive. Disponible en phase 7."
        >
          <Row icon={Upload} iconColor="var(--blue)" label="Exporter une sauvegarde" chevron onClick={() => {}} disabled />
          <Row icon={Download} iconColor="var(--green)" label="Importer une sauvegarde" chevron onClick={() => {}} disabled />
        </Section>

        <Section
          header="Stockage"
          footer={
            persisted
              ? 'Stockage protégé : l’iPhone ne supprimera pas tes données.'
              : isStandalone()
                ? 'Protection du stockage en attente.'
                : 'Installe l’app sur l’écran d’accueil (Partager → Sur l’écran d’accueil) pour protéger tes données.'
          }
        >
          <Row
            icon={HardDrive}
            iconColor="var(--gray)"
            label="Espace utilisé"
            detail={storage ? formatBytes(storage.usage) : '—'}
          />
          <Row
            icon={ShieldCheck}
            iconColor={persisted ? 'var(--green)' : 'var(--orange)'}
            label="Stockage protégé"
            detail={persisted ? 'Oui' : 'Non'}
          />
        </Section>

        <Section
          header="Mode démo"
          footer={
            demoLoaded
              ? 'Les données de démo sont chargées. Les effacer ne touche pas à tes propres données.'
              : 'Ajoute un exemple (road trip dans l’Ouest américain, quelques pays) pour tester l’app. Effaçable à tout moment.'
          }
        >
          <Row
            icon={FlaskConical}
            iconColor="var(--teal)"
            label={demoBusy ? 'Un instant…' : demoLoaded ? 'Effacer les données de démo' : 'Charger les données de démo'}
            destructive={demoLoaded}
            disabled={demoBusy}
            onClick={async () => {
              setDemoBusy(true)
              try {
                if (demoLoaded) await clearDemo()
                else await loadDemo()
              } finally {
                setDemoBusy(false)
              }
            }}
          />
        </Section>

        <Section header="À propos">
          <Row icon={Info} iconColor="var(--gray)" label="Version" detail={__APP_VERSION__} />
        </Section>
      </div>
    </BottomSheet>
  )
}
