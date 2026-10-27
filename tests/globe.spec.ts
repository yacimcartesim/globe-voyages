import { expect, test, type Page } from '@playwright/test'

// Phase 2 : ajout de pays, drapeaux sur le globe, fiche pays, statistiques.

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

/** Écrit des pays visités directement dans la base locale (plus rapide que l'interface) */
async function seedVisited(page: Page, codes: string[], wishlist: string[] = []) {
  await page.evaluate(
    async ({ codes, wishlist }) => {
      const db: IDBDatabase = await new Promise((res, rej) => {
        const r = indexedDB.open('globe-voyages')
        r.onsuccess = () => res(r.result)
        r.onerror = () => rej(r.error)
      })
      const tx = db.transaction('countries', 'readwrite')
      const store = tx.objectStore('countries')
      const now = new Date().toISOString()
      codes.forEach((code) => store.put({ code, status: 'visited', addedAt: now }))
      wishlist.forEach((code) => store.put({ code, status: 'wishlist', addedAt: now }))
      await new Promise((res) => (tx.oncomplete = res))
      db.close()
    },
    { codes, wishlist },
  )
}

test('ajout d’un pays par la recherche', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un pays' }).click()
  const sheet = page.getByRole('dialog', { name: 'Ajouter un pays' })
  await sheet.getByPlaceholder('Pays ou territoire').fill('reunion')
  await expect(sheet.getByText('La Réunion')).toBeVisible()
  await page.screenshot({ path: shot('7-recherche', info.project.name) })

  await sheet.getByPlaceholder('Pays ou territoire').fill('fran')
  await sheet.getByRole('button', { name: /^France/ }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByText('1 pays', { exact: true })).toBeVisible()
  // Rotation + fondu du drapeau
  await page.waitForTimeout(2500)
  await page.screenshot({ path: shot('8-globe-france', info.project.name) })

  // Tap sur la France (au centre de l'écran après le centrage) → sa fiche s'ouvre
  const vp = page.viewportSize()!
  await page.touchscreen.tap(vp.width / 2, vp.height / 2)
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'France' })).toBeVisible()
  expect(errors).toEqual([])
})

test('globe avec plusieurs pays, fiche pays et statistiques', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  // Attend que l'app ait créé sa base de données
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()
  await seedVisited(
    page,
    ['fr', 'es', 'it', 'de', 'gb-eng', 'gb-sct', 'es-tenerife', 'us', 'ru', 'jp', 'br', 'va', 'mt', 'ma', 'gl', 'gf', 'no', 'ca', 'au', 'fj'],
    ['nz', 'pe', 'is'],
  )
  await page.reload()
  await expect(page.getByText('16 pays', { exact: true })).toBeVisible()
  await expect(page.getByText('+ 2 territoires')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: shot('9-globe-plusieurs', info.project.name) })

  // Statistiques
  await page.getByRole('navigation').getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByText('16 pays sur 195')).toBeVisible()
  await page.waitForTimeout(800)
  await page.screenshot({ path: shot('10-stats-remplies', info.project.name) })

  // Fiche pays depuis la liste « Mes pays »
  await page.getByRole('button', { name: /Japon/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('heading', { name: 'Japon' })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('11-fiche-pays', info.project.name) })

  expect(errors).toEqual([])
})
