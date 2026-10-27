import { expect, test } from '@playwright/test'

// Phase 3 : voyages, étapes, carte d'itinéraire, infos pratiques, mode démo.

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

test('mode démo : voyage, carte et infos pratiques', async ({ page }, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()

  // Chargement de la démo depuis les Réglages
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Charger les données de démo' }).click()
  await expect(page.getByRole('button', { name: 'Effacer les données de démo' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByText('9 pays', { exact: true })).toBeVisible()

  // Liste des voyages
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  const card = page.getByRole('button', { name: /Road trip dans l’Ouest américain/ })
  await expect(card).toBeVisible()
  await expect(card).toContainText('7 étapes')
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('12-voyages', info.project.name) })

  // Fiche voyage : carte + étapes
  await card.click()
  const trip = page.getByRole('dialog', { name: 'Road trip dans l’Ouest américain' })
  await expect(trip.getByText('Death Valley', { exact: true }).first()).toBeVisible()
  await expect(trip.getByText('Jour 4 · jeu. 9 juil.')).toBeVisible()
  // Laisse le temps aux tuiles de la carte et aux tracés OSRM d'arriver
  await page.waitForTimeout(6000)
  await page.screenshot({ path: shot('13-itineraire', info.project.name) })

  // Tap sur une étape : sélection (notes affichées)
  await trip.getByText('Death Valley', { exact: true }).first().click()
  await expect(trip.getByText(/Badwater Basin/)).toBeVisible()

  // Infos pratiques
  await trip.getByRole('tab', { name: 'Infos' }).click()
  await expect(trip.getByText('Chaleur extrême')).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('14-infos', info.project.name) })

  // Retour et effacement de la démo
  await trip.getByRole('button', { name: 'Fermer' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Globe' }).click()
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Effacer les données de démo' }).click()
  await expect(page.getByRole('button', { name: 'Charger les données de démo' })).toBeVisible()
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()

  expect(errors).toEqual([])
})

test('création d’un voyage et ajout d’une étape', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: 'Créer un voyage' }).click()

  const form = page.getByRole('dialog', { name: 'Nouveau voyage' })
  await form.getByPlaceholder(/Titre/).fill('Week-end à Lisbonne')
  await form.getByRole('button', { name: 'Ajouter un pays' }).click()
  const picker = page.getByRole('dialog', { name: 'Pays du voyage' })
  await picker.getByPlaceholder('Pays ou territoire').fill('portu')
  await picker.getByRole('button', { name: /^Portugal/ }).click()
  await expect(form.locator('select')).toHaveValue('EUR')
  // Calendrier : titre → année → mois → jour ; la fin s'ouvre sur le mois du début
  await form.getByRole('button', { name: /^Début/ }).click()
  await form.getByRole('button', { name: 'Choisir l’année et le mois' }).click()
  await form.getByRole('button', { name: '2026', exact: true }).click()
  await form.getByRole('button', { name: 'mai', exact: true }).click()
  await form.getByRole('button', { name: 'vendredi 1 mai 2026' }).click()
  await form.getByRole('button', { name: /^Fin/ }).click()
  await expect(form.getByRole('button', { name: 'Choisir l’année et le mois' })).toHaveText(/mai 2026/)
  await form.getByRole('button', { name: 'dimanche 3 mai 2026' }).click()
  await page.screenshot({ path: shot('15-nouveau-voyage', info.project.name) })
  await form.getByRole('button', { name: 'Créer' }).click()

  // Le voyage s'ouvre, le Portugal est marqué visité
  const trip = page.getByRole('dialog', { name: 'Week-end à Lisbonne' })
  await expect(trip.getByText('1 – 3 mai 2026 · 3 jours')).toBeVisible()
  await trip.getByRole('button', { name: 'Ajouter une étape' }).click()

  const stop = page.getByRole('dialog', { name: 'Nouvelle étape' })
  if (info.project.name === 'clair') {
    // Recherche réelle sur OpenStreetMap (une seule fois pour ménager le service)
    await stop.getByPlaceholder(/Chercher un lieu/).fill('Lisbonne')
    await stop.getByRole('button', { name: /Lisbo/ }).first().click({ timeout: 15_000 })
    await expect(stop.getByText(/Position : 38\./)).toBeVisible()
  } else {
    await stop.getByPlaceholder('Nom de l’étape').fill('Lisbonne')
  }
  await page.waitForTimeout(300)
  await page.screenshot({ path: shot('16-etape', info.project.name) })
  await stop.getByRole('button', { name: 'OK' }).click()
  await expect(trip.getByText('Jour 1 · ven. 1 mai')).toBeVisible()
  await expect(trip.getByText(/^Lisbo/).first()).toBeVisible()

  expect(errors).toEqual([])
})
