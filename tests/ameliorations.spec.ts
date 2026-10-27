import { expect, test } from '@playwright/test'

// Améliorations après la v1 : îles et nations, drapeaux régionaux, compagnons proposés,
// calendrier rapide, migration des anciennes données « Royaume-Uni ».

const shot = (name: string, project: string) => `tests/screenshots/${project}-${name}.png`

test('île : Tenerife compte pour l’Espagne, avec le drapeau des Canaries', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await expect(page.getByText('0 pays', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un pays' }).click()
  const sheet = page.getByRole('dialog', { name: 'Ajouter un pays' })
  await sheet.getByPlaceholder('Pays ou territoire').fill('ecos')
  await expect(sheet.getByText('Nation · Royaume-Uni')).toBeVisible()
  await expect(sheet.getByRole('button', { name: /^Royaume-Uni/ })).toHaveCount(0)
  await sheet.getByPlaceholder('Pays ou territoire').fill('tener')
  await expect(sheet.getByText('Île · Espagne')).toBeVisible()
  await sheet.getByRole('button', { name: /^Tenerife/ }).click()
  await expect(page.getByText('1 pays', { exact: true })).toBeVisible()
  await page.waitForTimeout(2500)
  await page.screenshot({ path: shot('31-globe-tenerife', info.project.name) })

  await page.getByRole('navigation').getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByText('1 pays sur 195')).toBeVisible()
  await page.getByRole('button', { name: /Tenerife/ }).click()
  const fiche = page.getByRole('dialog')
  await expect(fiche.getByText('Compte pour Espagne dans les 195 pays.')).toBeVisible()
  await expect(fiche.locator('img').first()).toHaveAttribute('src', /x-canaries/)
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('32-fiche-tenerife', info.project.name) })
  expect(errors).toEqual([])
})

test('compagnons proposés et calendrier rapide', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()

  // Premier voyage avec deux compagnons
  await page.getByRole('button', { name: 'Créer un voyage' }).click()
  let form = page.getByRole('dialog', { name: 'Nouveau voyage' })
  await form.getByPlaceholder(/Titre/).fill('Guadeloupe')
  await form.getByRole('button', { name: 'Ajouter un pays' }).click()
  const picker = page.getByRole('dialog', { name: 'Pays du voyage' })
  await picker.getByPlaceholder('Pays ou territoire').fill('guadel')
  await picker.getByRole('button', { name: /^Guadeloupe/ }).click()
  await form.getByLabel('Compagnons de voyage').fill('Léa et Tom')
  await form.getByRole('button', { name: 'Créer' }).click()
  const trip = page.getByRole('dialog', { name: 'Guadeloupe' })
  await expect(trip).toBeVisible()
  await trip.getByRole('button', { name: 'Fermer' }).click()

  // Les cartes de voyage utilisent le drapeau de l'île
  await expect(page.locator('img[src*="x-guadeloupe"]').first()).toBeAttached()

  // Deuxième voyage : Léa et Tom sont proposés
  await page.getByRole('button', { name: 'Nouveau voyage' }).click()
  form = page.getByRole('dialog', { name: 'Nouveau voyage' })
  await form.getByPlaceholder(/Titre/).fill('Écosse')
  await form.getByRole('button', { name: 'Léa' }).click()
  await expect(form.getByLabel('Compagnons de voyage')).toHaveValue('Léa')
  await expect(form.getByRole('button', { name: 'Léa' })).toHaveCount(0)
  await form.getByRole('button', { name: 'Tom' }).click()
  await expect(form.getByLabel('Compagnons de voyage')).toHaveValue('Léa, Tom')

  // Calendrier : deux années en arrière d'un coup, puis la fin s'ouvre sur le même mois
  await form.getByRole('button', { name: /^Début/ }).click()
  const titre = form.getByRole('button', { name: 'Choisir l’année et le mois' })
  const avant = (await titre.textContent())!
  await form.getByRole('button', { name: 'Année précédente' }).click()
  await form.getByRole('button', { name: 'Année précédente' }).click()
  const annee = Number(avant.match(/\d{4}/)![0]) - 2
  await expect(titre).toHaveText(new RegExp(String(annee)))
  await form.getByRole('button', { name: /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) 13 / }).click()
  await form.getByRole('button', { name: /^Fin/ }).click()
  await expect(form.getByRole('button', { name: 'Choisir l’année et le mois' })).toHaveText(avant.replace(/\d{4}/, String(annee)))
  await page.waitForTimeout(400)
  await page.screenshot({ path: shot('33-calendrier', info.project.name) })
  expect(errors).toEqual([])
})

test('migration : un ancien « Royaume-Uni » devient l’Angleterre', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  // Base au format de la v1 (Dexie version 1 = IndexedDB version 10), avant l'ouverture de l'app
  await page.goto('./manifest.webmanifest')
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('globe-voyages', 10)
      r.onupgradeneeded = () => {
        const d = r.result
        d.createObjectStore('countries', { keyPath: 'code' }).createIndex('status', 'status')
        const trips = d.createObjectStore('trips', { keyPath: 'id' })
        trips.createIndex('countries', 'countries', { multiEntry: true })
        trips.createIndex('start', 'start')
        for (const s of ['stops', 'expenses', 'photos', 'notes', 'wishPlaces']) d.createObjectStore(s, { keyPath: 'id' })
        d.createObjectStore('meta', { keyPath: 'key' })
      }
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const tx = db.transaction(['countries', 'trips'], 'readwrite')
    const now = new Date().toISOString()
    tx.objectStore('countries').put({ code: 'gb', status: 'visited', addedAt: now })
    tx.objectStore('trips').put({ id: 't1', title: 'Londres', countries: ['gb'], currency: 'GBP', practical: {}, createdAt: now, updatedAt: now })
    await new Promise((res) => (tx.oncomplete = res))
    db.close()
  })
  await page.goto('./')
  await expect(page.getByText('1 pays', { exact: true })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Statistiques' }).click()
  await expect(page.getByRole('button', { name: /Angleterre/ })).toBeVisible()
  await page.getByRole('navigation').getByRole('button', { name: 'Voyages' }).click()
  await page.getByRole('button', { name: /Londres/ }).click()
  await expect(page.locator('img[src*="gb-eng"]').first()).toBeAttached()
  expect(errors).toEqual([])
})
