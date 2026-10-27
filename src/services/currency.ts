// Conversion de devises en euros avec l'API gratuite Frankfurter (taux de la Banque centrale européenne).
//
// Ordre de recherche du taux (1 unité de la devise = X €) :
// 1. Euro → 1
// 2. Devises à parité fixe avec l'euro (franc CFA, franc Pacifique) → taux officiel
// 3. Frankfurter, au jour de la dépense (≈ 30 devises couvertes)
// 4. Dernier taux connu, gardé sur l'appareil (pratique hors connexion)
// 5. Sinon : saisie manuelle par l'utilisateur

import { db } from '../db/db'

const API = 'https://api.frankfurter.dev/v1'

/** Parités fixes : 1 € = 655,957 XOF/XAF ; 1 000 XPF = 8,38 € */
const FIXED: Record<string, number> = {
  XOF: 1 / 655.957,
  XAF: 1 / 655.957,
  XPF: 1 / 119.3317,
}

type RateSource = 'fixed' | 'ecb' | 'cache'
export type RateResult = { rate: number; source: RateSource; date?: string }

const META_KEY = 'lastRates'
type LastRates = Record<string, { rate: number; date: string }>

const memory = new Map<string, RateResult>()

async function rememberRate(currency: string, rate: number, date: string) {
  const entry = await db.meta.get(META_KEY)
  const last = (entry?.value as LastRates | undefined) ?? {}
  last[currency] = { rate, date }
  await db.meta.put({ key: META_KEY, value: last })
}

async function lastKnownRate(currency: string): Promise<RateResult | null> {
  const entry = await db.meta.get(META_KEY)
  const hit = (entry?.value as LastRates | undefined)?.[currency]
  return hit ? { rate: hit.rate, source: 'cache', date: hit.date } : null
}

/**
 * Taux de conversion vers l'euro pour une devise et une date (« 2026-07-09 »).
 * Renvoie null si aucun taux n'est disponible : il faut alors le saisir à la main.
 */
export async function rateToEUR(currency: string, date?: string): Promise<RateResult | null> {
  if (currency === 'EUR') return { rate: 1, source: 'fixed' }
  if (FIXED[currency]) return { rate: FIXED[currency], source: 'fixed' }

  // Pas de taux pour une date future : on prend le plus récent
  const today = new Date().toISOString().slice(0, 10)
  const day = date && date <= today ? date : 'latest'
  const key = `${currency}:${day}`
  const cached = memory.get(key)
  if (cached) return cached

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(`${API}/${day}?base=${currency}&symbols=EUR`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) {
      const data = (await res.json()) as { date: string; rates: { EUR?: number } }
      if (data.rates.EUR) {
        const result: RateResult = { rate: data.rates.EUR, source: 'ecb', date: data.date }
        memory.set(key, result)
        void rememberRate(currency, data.rates.EUR, data.date)
        return result
      }
    }
  } catch {
    // Hors connexion ou service indisponible : on tente le dernier taux connu
  }
  return lastKnownRate(currency)
}

/** Arrondi au centime */
export const round2 = (n: number) => Math.round(n * 100) / 100

/** Lit un montant saisi au clavier français (« 12,50 », « 1 234,5 ») */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/\s/g, '').replace(',', '.')
  if (!/^\d*\.?\d+$|^\d+\.$/.test(clean)) return null
  const n = Number(clean)
  return Number.isFinite(n) ? n : null
}

const formatters = new Map<string, Intl.NumberFormat>()

/** « 1 234,50 € », « 89,00 $US » */
export function formatMoney(amount: number, currency = 'EUR', compact = false): string {
  const key = `${currency}:${compact}`
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 0 : 2,
      minimumFractionDigits: compact ? 0 : undefined,
    })
    formatters.set(key, f)
  }
  return f.format(amount)
}
