import { expect, test } from '@playwright/test'

// Phase 4 : import de photos (compression, EXIF), rattachement automatique, galerie, visionneuse, carte.
// Les photos de test (tests/fixtures) contiennent une date et, pour deux d'entre elles, une position GPS.

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

test('import, rattachement automatique, visionneuse et carte', async ({ page }, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()

  // Démo (road trip avec étapes)
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Charger les données de démo' }).click()
  await expect(page.getByRole('button', { name: 'Effacer les données de démo' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'OK' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: /Road trip/ }).click()
  const trip = page.getByRole('dialog', { name: /Road trip/ })
  await trip.getByRole('tab', { name: 'Photos' }).click()

  // Import de 3 photos
  await trip.getByTestId('photo-input').setInputFiles([
    'tests/fixtures/death-valley.jpg',
    'tests/fixtures/las-vegas.jpg',
    'tests/fixtures/sans-gps.jpg',
  ])
  await expect(trip.getByRole('status')).toHaveText(
    '3 photos importées · 2 rattachées automatiquement à une étape · 1 à classer',
    { timeout: 30_000 },
  )
  await expect(trip.getByRole('heading', { name: 'Death Valley' })).toBeVisible()
  await expect(trip.getByRole('heading', { name: 'Las Vegas' })).toBeVisible()
  await expect(trip.getByRole('heading', { name: 'À classer' })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('17-photos', info.project.name) })

  // Visionneuse : date locale conservée (7 h 12 à Death Valley), défilement, légende
  await trip.getByRole('button', { name: 'Photo', exact: true }).first().click()
  const viewer = page.getByRole('dialog', { name: 'Photo' })
  await expect(viewer.getByText('1 / 3')).toBeVisible()
  await expect(viewer.getByText(/jeudi 9 juillet.*07:12 · Death Valley/)).toBeVisible()
  await viewer.getByLabel('Légende').fill('Lever de soleil sur Badwater')
  await viewer.getByLabel('Légende').press('Enter')
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('18-visionneuse', info.project.name) })
  await page.keyboard.press('ArrowRight')
  await expect(viewer.getByText('2 / 3')).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(viewer.getByText('3 / 3')).toBeVisible()

  // Rattachement manuel de la photo sans GPS
  await viewer.getByRole('button', { name: 'Options de la photo' }).click()
  await viewer.getByRole('button', { name: 'Rattacher à une étape…' }).click()
  await page.getByRole('dialog', { name: 'Rattacher à une étape' }).getByRole('button', { name: /Joshua Tree/ }).click()
  await expect(viewer.getByText(/Joshua Tree/)).toBeVisible()
  await viewer.getByRole('button', { name: 'Fermer' }).click()
  await expect(trip.getByRole('heading', { name: 'Joshua Tree' })).toBeVisible()
  await expect(trip.getByRole('heading', { name: 'À classer' })).toBeHidden()

  // Vignettes sur la carte
  await trip.getByRole('tab', { name: 'Itinéraire' }).click()
  await expect(trip.locator('.photo-marker')).toHaveCount(2)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: shot('19-carte-photos', info.project.name) })

  // La première photo est devenue la couverture du voyage
  await trip.getByRole('button', { name: 'Fermer' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('20-couverture', info.project.name) })

  expect(errors).toEqual([])
})
