// Territoires affichés sur le globe mais NON comptés dans les 195 pays.
// Ils peuvent être marqués visités et ont leur propre drapeau (ou celui du pays de rattachement).
// [code ISO alpha-2, nom français, pays de rattachement (ou null si statut particulier)]

export type Territory = { code: string; name: string; parent: string | null }

const RAW: [string, string, string | null][] = [
  // France
  ['gf', 'Guyane', 'fr'],
  ['gp', 'Guadeloupe', 'fr'],
  ['mq', 'Martinique', 'fr'],
  ['re', 'La Réunion', 'fr'],
  ['yt', 'Mayotte', 'fr'],
  ['nc', 'Nouvelle-Calédonie', 'fr'],
  ['pf', 'Polynésie française', 'fr'],
  ['pm', 'Saint-Pierre-et-Miquelon', 'fr'],
  ['wf', 'Wallis-et-Futuna', 'fr'],
  ['bl', 'Saint-Barthélemy', 'fr'],
  ['mf', 'Saint-Martin (partie française)', 'fr'],
  ['tf', 'Terres australes et antarctiques françaises', 'fr'],
  // Danemark
  ['gl', 'Groenland', 'dk'],
  ['fo', 'Îles Féroé', 'dk'],
  // Norvège, Finlande
  ['sj', 'Svalbard', 'no'],
  ['ax', 'Åland', 'fi'],
  // Pays-Bas
  ['aw', 'Aruba', 'nl'],
  ['cw', 'Curaçao', 'nl'],
  ['sx', 'Saint-Martin (partie néerlandaise)', 'nl'],
  ['bq', 'Pays-Bas caribéens', 'nl'],
  // Royaume-Uni
  ['gg', 'Guernesey', 'gb'],
  ['je', 'Jersey', 'gb'],
  ['im', 'Île de Man', 'gb'],
  ['bm', 'Bermudes', 'gb'],
  ['ky', 'Îles Caïmans', 'gb'],
  ['vg', 'Îles Vierges britanniques', 'gb'],
  ['tc', 'Îles Turques-et-Caïques', 'gb'],
  ['ai', 'Anguilla', 'gb'],
  ['ms', 'Montserrat', 'gb'],
  ['fk', 'Îles Malouines', 'gb'],
  ['gs', 'Géorgie du Sud-et-les Îles Sandwich du Sud', 'gb'],
  ['sh', 'Sainte-Hélène', 'gb'],
  ['pn', 'Îles Pitcairn', 'gb'],
  ['io', 'Territoire britannique de l’océan Indien', 'gb'],
  // États-Unis
  ['pr', 'Porto Rico', 'us'],
  ['vi', 'Îles Vierges des États-Unis', 'us'],
  ['gu', 'Guam', 'us'],
  ['mp', 'Îles Mariannes du Nord', 'us'],
  ['as', 'Samoa américaines', 'us'],
  // Australie, Nouvelle-Zélande
  ['nf', 'Île Norfolk', 'au'],
  ['cx', 'Île Christmas', 'au'],
  ['cc', 'Îles Cocos', 'au'],
  ['hm', 'Îles Heard-et-MacDonald', 'au'],
  ['ck', 'Îles Cook', 'nz'],
  ['nu', 'Niue', 'nz'],
  ['tk', 'Tokelau', 'nz'],
  // Chine
  ['hk', 'Hong Kong', 'cn'],
  ['mo', 'Macao', 'cn'],
  // Statut particulier
  ['xk', 'Kosovo', null],
  ['tw', 'Taïwan', null],
  ['eh', 'Sahara occidental', null],
  ['aq', 'Antarctique', null],
]

export const TERRITORIES: Territory[] = RAW.map(([code, name, parent]) => ({ code, name, parent }))
export const TERRITORY_BY_CODE = new Map(TERRITORIES.map((t) => [t.code, t]))
