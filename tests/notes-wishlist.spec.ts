import { expect, test } from '@playwright/test'

// Phase 6 : notes rapides (position, boîte de réception, classement) et wishlist (« C'est fait »).

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

test.use({ geolocation: { latitude: 33.8303, longitude: -116.5453 }, permissions: ['geolocation'] })

test('note rapide avec position, boîte de réception et classement', async ({ page }, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Charger les données de démo' }).click()
  await expect(page.getByRole('button', { name: 'Effacer les données de démo' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'OK' }).click()

  // Note rapide depuis le globe, avec la position actuelle
  await page.getByRole('button', { name: 'Note rapide' }).click()
  const sheet = page.getByRole('dialog', { name: 'Note rapide' })
  await sheet.getByLabel('Texte de la note').fill('Location de vélos à Palm Springs : 25 $ la journée')
  await sheet.getByRole('switch', { name: 'Ajouter ma position' }).click()
  await expect(sheet.getByText('Position : 33.8303, -116.5453')).toBeVisible()
  await page.screenshot({ path: shot('23-note-rapide', info.project.name) })
  await sheet.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(sheet).toBeHidden()

  // Boîte de réception (la note de démo + la nouvelle)
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: /Boîte de réception/ }).click()
  const inbox = page.getByRole('dialog', { name: 'Boîte de réception' })
  await expect(inbox.getByText(/Peggy Sue’s Diner/)).toBeVisible()
  await expect(inbox.getByText(/Location de vélos/)).toBeVisible()
  await page.screenshot({ path: shot('24-boite-reception', info.project.name) })

  // La note de démo (avec position) devient une étape
  await inbox.getByRole('button', { name: 'Classer…' }).nth(1).click()
  const triage = page.getByRole('dialog', { name: 'Classer la note' })
  await expect(triage.getByRole('button', { name: 'Étape', pressed: true })).toBeVisible()
  await triage.getByRole('button', { name: 'Classer', exact: true }).click()
  await expect(inbox.getByRole('button', { name: 'Classer…' })).toHaveCount(1)
  // La note vélo devient un conseil
  await inbox.getByRole('button', { name: 'Classer…' }).click()
  await triage.getByRole('button', { name: 'Conseil' }).click()
  await triage.getByRole('button', { name: 'Classer', exact: true }).click()
  await expect(inbox.getByText('Tout est classé')).toBeVisible()
  await inbox.getByRole('button', { name: 'OK' }).click()

  // Vérification dans le voyage
  await page.getByRole('button', { name: /Road trip/ }).click()
  const trip = page.getByRole('dialog', { name: /Road trip/ })
  await expect(trip.getByText('Peggy Sue’s Diner à Yermo', { exact: true })).toBeVisible()
  await trip.getByRole('tab', { name: 'Infos' }).click()
  await expect(trip.getByText(/Location de vélos à Palm Springs/)).toBeVisible()

  expect(errors).toEqual([])
})

test('wishlist : pays, priorité, « C’est fait » et lieux', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Wishlist' }).click()

  // Ajout d'un pays
  await page.getByRole('button', { name: 'Ajouter un pays' }).click()
  const picker = page.getByRole('dialog', { name: 'Ajouter à la wishlist' })
  await picker.getByPlaceholder('Pays ou territoire').fill('japon')
  await picker.getByRole('button', { name: /^Japon/ }).click()
  await expect(page.getByRole('main').getByRole('button', { name: /Japon/ })).toContainText('Un jour')

  // Priorité puis « C'est fait ! »
  await page.getByRole('main').getByRole('button', { name: /Japon/ }).click()
  const sheet = page.getByRole('dialog').last()
  await sheet.getByRole('button', { name: 'Prioritaire' }).click()
  await expect(page.getByRole('main').getByRole('button', { name: /Japon/ }).first()).toContainText('Prioritaire')
  await page.screenshot({ path: shot('25-wishlist-pays', info.project.name) })
  await sheet.getByRole('button', { name: 'C’est fait !' }).click()
  await expect(sheet.getByText('Bravo, c’est fait !')).toBeVisible()
  await sheet.getByRole('button', { name: 'Créer le voyage' }).click()
  const form = page.getByRole('dialog', { name: 'Nouveau voyage' })
  await expect(form.getByText('Japon', { exact: true })).toBeVisible()
  await form.getByRole('button', { name: 'Annuler' }).click()

  // Le Japon est passé dans les pays visités
  await page.getByRole('navigation').getByRole('button', { name: 'Globe' }).click()
  await expect(page.getByText('1 pays', { exact: true })).toBeVisible()

  // Lieu précis
  await page.getByRole('navigation').getByRole('button', { name: 'Wishlist' }).click()
  await page.getByRole('tab', { name: /Lieux/ }).click()
  await page.getByRole('button', { name: 'Ajouter un lieu' }).click()
  const place = page.getByRole('dialog', { name: 'Nouveau lieu' })
  await place.getByPlaceholder('Nom du lieu').fill('Fjord de Geiranger')
  await place.getByRole('button', { name: 'Prioritaire' }).click()
  await place.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByRole('main').getByRole('button', { name: /Fjord de Geiranger/ })).toContainText('Prioritaire')
  await page.screenshot({ path: shot('26-wishlist-lieux', info.project.name) })

  expect(errors).toEqual([])
})
