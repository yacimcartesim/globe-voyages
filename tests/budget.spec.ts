import { expect, test } from '@playwright/test'

// Phase 5 : budget, conversion de devises (Frankfurter), saisie manuelle du taux.

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

test('budget : total, répartition, ajout avec conversion et taux manuel', async ({ page }, info) => {
  test.setTimeout(90_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Réglages' }).click()
  await page.getByRole('button', { name: 'Charger les données de démo' }).click()
  await expect(page.getByRole('button', { name: 'Effacer les données de démo' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'OK' }).click()
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: /Road trip/ }).click()
  const trip = page.getByRole('dialog', { name: /Road trip/ })
  await trip.getByRole('tab', { name: 'Budget' }).click()

  // 15 dépenses de démo en dollars, converties à 0,8745 €
  await expect(trip.getByText('2 079,03 €')).toBeVisible()
  await expect(trip.getByText(/189\s€ par jour en moyenne · 15 dépenses/)).toBeVisible()
  await expect(trip.getByText('Logement')).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: shot('21-budget', info.project.name) })

  // Ajout en dollars : taux BCE du jour récupéré automatiquement
  await trip.getByRole('button', { name: 'Ajouter une dépense' }).click()
  const form = page.getByRole('dialog', { name: 'Nouvelle dépense' })
  await form.getByLabel('Montant').fill('25')
  await form.getByPlaceholder(/Description/).fill('Café glacé')
  await expect(form.getByText(/Taux de la BCE du/)).toBeVisible({ timeout: 15_000 })
  await expect(form.getByText(/≈ 2\d,\d\d\s€/)).toBeVisible()
  await page.screenshot({ path: shot('22-depense', info.project.name) })
  await form.getByRole('button', { name: 'OK' }).click()
  await expect(trip.getByText('Café glacé')).toBeVisible()
  await expect(trip.getByText(/16 dépenses/)).toBeVisible()

  // Devise non couverte par la BCE : saisie manuelle du taux
  await trip.getByRole('button', { name: 'Ajouter une dépense' }).click()
  await form.getByLabel('Devise').selectOption('VND')
  await form.getByLabel('Montant').fill('500000')
  await expect(form.getByText(/Taux introuvable/)).toBeVisible({ timeout: 15_000 })
  await form.getByLabel('Taux de change').fill('0,000035')
  await expect(form.getByText('≈ 17,50 €')).toBeVisible()
  await form.getByRole('button', { name: 'OK' }).click()
  await expect(trip.getByText('17,50 €')).toBeVisible()

  expect(errors).toEqual([])
})
