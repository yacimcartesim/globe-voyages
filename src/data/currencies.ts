// Devises proposées pour les voyages, et devise devinée à partir du pays.

const names = new Intl.DisplayNames(['fr'], { type: 'currency' })

/** Devises courantes (codes ISO 4217) */
export const CURRENCIES = [
  'EUR', 'USD', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'HKD', 'SGD', 'KRW', 'THB', 'VND', 'IDR',
  'MYR', 'PHP', 'INR', 'AED', 'TRY', 'MAD', 'TND', 'EGP', 'ZAR', 'MXN', 'BRL', 'ARS', 'CLP', 'PEN', 'COP',
  'NOK', 'SEK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'RON', 'XOF', 'XPF',
]

export const currencyName = (code: string) => {
  try {
    const n = names.of(code) ?? code
    return n.charAt(0).toUpperCase() + n.slice(1)
  } catch {
    return code
  }
}

const EURO = ['fr', 'de', 'es', 'it', 'pt', 'be', 'nl', 'lu', 'at', 'ie', 'fi', 'gr', 'sk', 'si', 'ee', 'lv', 'lt', 'mt', 'cy', 'hr', 'mc', 'sm', 'va', 'ad', 'me', 'xk', 'gf', 'gp', 'mq', 're', 'yt', 'bl', 'mf', 'pm']

const BY_COUNTRY: Record<string, string> = {
  us: 'USD', pr: 'USD', ec: 'USD', sv: 'USD', pa: 'USD', gb: 'GBP', ch: 'CHF', li: 'CHF', ca: 'CAD', au: 'AUD',
  nz: 'NZD', jp: 'JPY', cn: 'CNY', hk: 'HKD', sg: 'SGD', kr: 'KRW', th: 'THB', vn: 'VND', id: 'IDR', my: 'MYR',
  ph: 'PHP', in: 'INR', ae: 'AED', tr: 'TRY', ma: 'MAD', tn: 'TND', eg: 'EGP', za: 'ZAR', mx: 'MXN', br: 'BRL',
  ar: 'ARS', cl: 'CLP', pe: 'PEN', co: 'COP', no: 'NOK', se: 'SEK', dk: 'DKK', gl: 'DKK', fo: 'DKK', is: 'ISK',
  pl: 'PLN', cz: 'CZK', hu: 'HUF', ro: 'RON', sn: 'XOF', ci: 'XOF', ml: 'XOF', bj: 'XOF', tg: 'XOF', bf: 'XOF',
  ne: 'XOF', pf: 'XPF', nc: 'XPF', wf: 'XPF',
}

/** Devise probable d'un pays (euro par défaut) */
export function currencyForCountry(code: string | undefined): string {
  if (!code) return 'EUR'
  if (EURO.includes(code)) return 'EUR'
  return BY_COUNTRY[code] ?? 'EUR'
}
