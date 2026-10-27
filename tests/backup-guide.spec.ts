import { expect, test, type Page } from '@playwright/test'

// Phase 7 : sauvegarde ZIP (export, rappel, import avec aperçu, fusion/remplacement) et guide PDF.

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

async function loadDemo(page: Page) {
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Charger les données de démo' }).click()
  await expect(page.getByRole('button', { name: 'Effacer les données de démo' })).toBeVisible({ timeout: 30_000 })
}

test('sauvegarde : rappel, export, import avec aperçu et remplacement', async ({ page, browser }, info) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loadDemo(page)

  // Une photo, pour vérifier qu'elle fait l'aller-retour dans le ZIP
  await page.getByRole('button', { name: 'OK' }).click()
  // Rappel discret : une pastille dans le coin, le message s'ouvre au toucher
  await page.getByRole('button', { name: 'Rappel de sauvegarde' }).click()
  await expect(page.getByText('Tu n’as encore jamais sauvegardé tes données.')).toBeVisible()
  await page.screenshot({ path: shot('27-rappel', info.project.name) })
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: /Road trip/ }).click()
  const trip = page.getByRole('dialog', { name: /Road trip/ })
  await trip.getByRole('tab', { name: 'Photos' }).click()
  await trip.getByTestId('photo-input').setInputFiles(['tests/fixtures/death-valley.jpg'])
  await expect(trip.getByRole('status')).toContainText('1 photo importée', { timeout: 20_000 })
  await trip.getByRole('button', { name: 'Fermer' }).click()

  // Export (dans le navigateur de test : téléchargement)
  await page.getByRole('navigation').getByRole('button', { name: 'Globe' }).click()
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter une sauvegarde' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^globe-voyages-\d{4}-\d{2}-\d{2}\.zip$/)
  const zipPath = info.outputPath('sauvegarde.zip')
  await download.saveAs(zipPath)
  await expect(page.getByText(/Dernière sauvegarde aujourd’hui|téléchargé/)).toBeVisible()
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByText('Tu n’as encore jamais sauvegardé tes données.')).toBeHidden()

  // Restauration sur un « autre appareil » (navigateur vierge)
  const other = await browser.newContext({ ...info.project.use, baseURL: 'http://localhost:4173/globe-voyages/' })
  const page2 = await other.newPage()
  page2.on('pageerror', (e) => errors.push(e.message))
  await page2.goto('./')
  await expect(page2.getByText('0 pays', { exact: true })).toBeVisible()
  await page2.getByRole('button', { name: 'Réglages' }).click()
  await page2.getByTestId('backup-input').setInputFiles(zipPath)
  const preview = page2.getByRole('dialog', { name: 'Importer une sauvegarde' })
  await expect(preview.getByRole('button', { name: /Fusionner/ })).toBeVisible()
  await expect(preview.getByText('Pays et territoires visités')).toBeVisible()
  await expect(preview.getByText('Étapes').locator('..')).toContainText('7')
  await expect(preview.getByText('Photos').locator('..')).toContainText('1')
  await expect(preview.getByText('Dépenses').locator('..')).toContainText('15')
  await page2.screenshot({ path: shot('28-import-apercu', info.project.name) })
  await preview.getByRole('button', { name: 'Remplacer mes données' }).click()
  await preview.getByRole('button', { name: 'Confirmer : tout remplacer' }).click()
  await expect(page2.getByText('Tes données ont été remplacées par la sauvegarde.')).toBeVisible({ timeout: 20_000 })
  await page2.getByRole('button', { name: 'OK' }).click()
  await expect(page2.getByText('9 pays', { exact: true })).toBeVisible()
  await page2.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page2.getByRole('button', { name: /Road trip/ }).click()
  const trip2 = page2.getByRole('dialog', { name: /Road trip/ })
  await trip2.getByRole('tab', { name: 'Photos' }).click()
  await expect(trip2.getByRole('button', { name: 'Photo', exact: true })).toHaveCount(1)
  await other.close()

  // Un fichier qui n'est pas une sauvegarde est refusé proprement
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByTestId('backup-input').setInputFiles('tests/fixtures/sans-gps.jpg')
  await expect(page.getByText('Ce fichier n’est pas un ZIP valide.')).toBeVisible()

  expect(errors).toEqual([])
})

test('guide du voyage imprimable', async ({ page }, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loadDemo(page)
  await page.getByRole('button', { name: 'OK' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: /Road trip/ }).click()
  const trip = page.getByRole('dialog', { name: /Road trip/ })
  await expect(trip.getByText('Death Valley', { exact: true }).first()).toBeVisible()
  await page.waitForTimeout(4000) // tracés OSRM
  await trip.getByRole('button', { name: 'Options' }).click()
  await trip.getByRole('button', { name: 'Exporter en guide (PDF)' }).click()

  const guide = page.getByRole('dialog', { name: /Guide/ })
  await expect(guide.getByRole('button', { name: 'PDF' })).toBeEnabled({ timeout: 30_000 })
  await expect(guide.getByRole('heading', { name: 'Itinéraire' })).toBeVisible()
  await expect(guide.getByRole('img', { name: 'Carte de l’itinéraire' })).toBeVisible()
  await expect(guide.getByRole('heading', { name: 'Infos pratiques' })).toBeVisible()
  await expect(guide.getByText('2 079,03 €')).toBeVisible()
  await page.screenshot({ path: shot('29-guide', info.project.name) })

  // Rendu impression : seule la page du guide est visible
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation')).toBeHidden()
  await expect(guide.getByRole('button', { name: 'PDF' })).toBeHidden()
  await page.setViewportSize({ width: 794, height: 1123 }) // A4 à 96 dpi
  await page.screenshot({ path: shot('30-guide-impression', info.project.name), fullPage: true })
  await page.emulateMedia({ media: 'screen' })

  expect(errors).toEqual([])
})
