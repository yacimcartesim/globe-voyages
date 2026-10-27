import { expect, test } from '@playwright/test'

// Parcourt chaque onglet et la fiche Réglages, vérifie l'essentiel et prend une capture.

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

test('navigation et écrans principaux', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Mon globe' })).toBeVisible()
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()
  await page.waitForTimeout(600)
  await page.screenshot({ path: shot('1-globe', info.project.name) })

  const tabs = [
    { label: 'Voyages', heading: 'Voyages', file: '2-voyages' },
    { label: 'Statistiques', heading: 'Statistiques', file: '3-stats' },
    { label: 'Wishlist', heading: 'Wishlist', file: '4-wishlist' },
  ]
  for (const t of tabs) {
    await page.getByRole('navigation').getByRole('button', { name: t.label }).click()
    await expect(page.getByRole('heading', { name: t.heading, level: 1 })).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: shot(t.file, info.project.name) })
  }

  // Le contrôle segmenté des statistiques
  await page.getByRole('navigation').getByRole('button', { name: 'Statistiques' }).click()
  await page.getByRole('tab', { name: 'Territoires' }).click()
  await expect(page.getByText('Aucun territoire')).toBeVisible()
  await page.getByRole('tab', { name: 'Continents' }).click()

  // Défilement : le grand titre se réduit dans la barre
  // (la molette n'existe pas sur iPhone : on fait défiler l'écran visible par script)
  await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll<HTMLElement>('.overflow-y-auto')]
    scrollers.find((el) => el.offsetParent !== null)?.scrollTo({ top: 400 })
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('5-stats-scroll', info.project.name) })

  // Fiche Réglages depuis le globe
  await page.getByRole('navigation').getByRole('button', { name: 'Globe' }).click()
  await page.getByRole('button', { name: 'Réglages' }).click()
  const sheet = page.getByRole('dialog', { name: 'Réglages' })
  await expect(sheet).toBeVisible()
  await sheet.getByRole('switch', { name: 'Rotation automatique' }).click()
  await expect(sheet.getByRole('switch', { name: 'Rotation automatique' })).toHaveAttribute('aria-checked', 'false')
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('6-reglages', info.project.name) })
  await sheet.getByRole('button', { name: 'OK' }).click()
  await expect(sheet).toBeHidden()

  expect(errors).toEqual([])
})

test('PWA : manifeste et service worker', async ({ page, request }) => {
  const res = await request.get('manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const manifest = await res.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/globe-voyages/')

  await page.goto('./')
  const swReady = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return !!reg.active
  })
  expect(swReady).toBe(true)
})
