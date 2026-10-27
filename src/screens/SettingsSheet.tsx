import { useEffect, useState } from 'react'
import { Download, HardDrive, Info, RotateCw, ShieldCheck, Upload } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button, Switch } from '../ui/controls'
import { usePreference } from '../hooks/usePreference'
import { formatBytes, getStorageInfo, isStandalone, isStoragePersisted, type StorageInfo } from '../services/storage'

type Props = { open: boolean; onClose: () => void }

export function SettingsSheet({ open, onClose }: Props) {
  const [autoRotate, setAutoRotate] = usePreference('autoRotate', true)
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [persisted, setPersisted] = useState(false)

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

        <Section header="À propos">
          <Row icon={Info} iconColor="var(--gray)" label="Version" detail={__APP_VERSION__} />
        </Section>
      </div>
    </BottomSheet>
  )
}
