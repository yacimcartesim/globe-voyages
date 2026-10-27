# Globe de voyages

Application personnelle (PWA) : un globe 3D qui affiche les pays visités avec leur drapeau, des fiches voyage (itinéraire sur carte, photos, infos pratiques, budget), une wishlist et des notes rapides. Elle s'installe sur l'iPhone comme une vraie app, fonctionne hors connexion, et **toutes les données restent sur l'appareil**.

Adresse de l'app : **https://yacimcartesim.github.io/globe-voyages/**

---

## Sommaire

1. [Installer l'app sur l'iPhone](#1-installer-lapp-sur-liphone)
2. [Sauvegarder ses données (important)](#2-sauvegarder-ses-données-important)
3. [Lancer l'app sur le Mac pour la modifier](#3-lancer-lapp-sur-le-mac-pour-la-modifier)
4. [Modifier l'app](#4-modifier-lapp)
5. [Mettre en ligne une nouvelle version](#5-mettre-en-ligne-une-nouvelle-version)
6. [Tests automatiques](#6-tests-automatiques)
7. [Services gratuits utilisés et limites](#7-services-gratuits-utilisés-et-limites)
8. [Dépannage](#8-dépannage)

---

## 1. Installer l'app sur l'iPhone

1. Ouvrir **Safari** (pas Chrome) à l'adresse https://yacimcartesim.github.io/globe-voyages/
2. Toucher le bouton **Partager** (carré avec une flèche vers le haut).
3. Choisir **Sur l'écran d'accueil**, puis **Ajouter**.
4. Toujours ouvrir l'app **depuis son icône** : c'est ce qui protège les données (Safari peut effacer les données d'un simple site non visité pendant 7 jours, mais pas celles d'une app installée).

Dans **Réglages → Stockage**, la ligne « Stockage protégé » doit indiquer **Oui** après l'installation.

## 2. Sauvegarder ses données (important)

Les données (pays, voyages, photos…) vivent **uniquement sur l'appareil**. Si l'iPhone est perdu ou l'app supprimée, elles disparaissent. D'où :

- **Exporter** : Réglages → **Exporter une sauvegarde** → « Enregistrer dans Fichiers » → iCloud Drive. Le fichier `globe-voyages-AAAA-MM-JJ.zip` contient `data.json` (les données) et un dossier `photos/` (les photos en JPEG, lisibles sans l'app).
- **Importer** : Réglages → **Importer une sauvegarde** → choisir le ZIP. Un aperçu s'affiche, puis :
  - **Fusionner** : ajoute le contenu sans rien effacer (pour transférer de l'iPhone vers le Mac, par exemple) ;
  - **Remplacer** : efface tout puis restaure la sauvegarde.
- L'app affiche un **rappel** sur l'écran Globe si la dernière sauvegarde a plus de 14 jours, ou si beaucoup de contenu a été ajouté depuis.

> iPhone et Mac ont chacun leurs propres données. Pour retrouver sur le Mac ce qui a été saisi sur l'iPhone : exporter sur l'iPhone, puis importer (« Fusionner ») sur le Mac.

## 3. Lancer l'app sur le Mac pour la modifier

### Prérequis (une seule fois)

- **Node.js** (version 24 ou plus récente) : https://nodejs.org → bouton « LTS » → installer le fichier `.pkg`.
- **Git** : déjà installé avec les outils de développement Apple (`xcode-select --install` si besoin).

Vérifier dans le Terminal :

```bash
node --version
```

### Lancer

Dans le Terminal (les guillemets sont nécessaires à cause de l'espace dans « Docs perso ») :

```bash
cd ~/Documents/"Docs perso"/globe-voyages
npm install
npm run dev
```

Puis ouvrir http://localhost:5173/globe-voyages/ dans Safari. Pour tester sur l'iPhone (même Wi-Fi), utiliser l'adresse « Network » affichée par la commande. `Ctrl + C` arrête le serveur.

> En local, l'installation sur l'écran d'accueil, le hors-ligne et la localisation ne fonctionnent pas sur l'iPhone (il faut du HTTPS). Ils fonctionnent une fois l'app en ligne.

### Mode démo

Réglages → **Charger les données de démo** : un road trip dans l'Ouest américain (étapes, photos à importer, infos pratiques, dépenses), quelques pays, une note à classer et un lieu de wishlist. **Effacer les données de démo** retire uniquement ce que la démo a ajouté.

## 4. Modifier l'app

Le code est en **TypeScript + React**, commenté en français.

```
globe-voyages/
├─ public/              Icônes, écrans de démarrage iPhone, logo
├─ scripts/build-geo.mjs  Prépare les frontières du globe (Natural Earth)
├─ src/
│  ├─ data/             Listes de référence : 195 pays, territoires, continents, devises, drapeaux
│  ├─ db/               Base de données locale (schéma, voyages, photos, dépenses, notes, démo)
│  ├─ services/         Géocodage, tracés routiers, photos, devises, sauvegarde, localisation
│  ├─ globe/            Globe 3D et génération de l'image avec les drapeaux
│  ├─ map/              Carte d'itinéraire (MapLibre)
│  ├─ print/            Guide imprimable (PDF)
│  ├─ screens/          Écrans et fiches (Globe, Voyages, Statistiques, Wishlist, Réglages…)
│  ├─ ui/               Composants de base (tab bar, fiches, listes, boutons, verre…)
│  └─ index.css         Couleurs, typographie, Liquid Glass
├─ tests/               Tests Playwright (iPhone 15, clair et sombre)
└─ .github/workflows/   Déploiement automatique sur GitHub Pages
```

Exemples de modifications courantes :

| Je veux… | Fichier |
|---|---|
| Changer le continent d'un pays, ou la liste des 195 | `src/data/countries.ts` |
| Ajouter/renommer un territoire | `src/data/territories.ts` |
| Ajouter une île ou une région affichée à part (Tenerife, Corse, Écosse…) | `src/data/parts.json`, puis `npm run geo` |
| Changer le drapeau d'une île ou d'un territoire | `src/data/flags/` (SVG) et `src/data/parts.json` |
| Changer les couleurs du globe (océan, pays, wishlist) | `src/globe/texture.ts` (`PALETTE_LIGHT`, `PALETTE_DARK`) |
| Changer les couleurs de l'app | `src/index.css` |
| Ajouter une devise | `src/data/currencies.ts` |
| Modifier les sections d'infos pratiques | `src/screens/trip/PracticalTab.tsx` |
| Changer l'icône de l'app | remplacer `public/logo.svg` et `public/splash.svg`, puis `npm run generate:icons` |
| Mettre à jour les frontières | `npm run geo` (télécharge Natural Earth et régénère `src/data/world.topo.json`) |

### Si la structure des données change

Le schéma est versionné (`SCHEMA_VERSION` dans `src/db/schema.ts`). Pour le faire évoluer sans perdre de données :

1. incrémenter `SCHEMA_VERSION` ;
2. ajouter `db.version(2).stores({...}).upgrade(...)` dans `src/db/db.ts` (Dexie migre les données existantes à l'ouverture) ;
3. compléter la fonction `migrate()` de `src/services/backup.ts` pour que les anciennes sauvegardes restent importables.

## 5. Mettre en ligne une nouvelle version

Le déploiement est **automatique** : à chaque `git push` sur la branche `main`, GitHub construit l'app et la publie (onglet **Actions** du dépôt, environ 1 à 2 minutes).

```bash
git add -A
git commit -m "Description de la modification"
git push
```

Sur l'iPhone, l'app se met à jour toute seule à l'ouverture suivante (parfois il faut la fermer et la rouvrir une fois).

**Les données ne sont jamais perdues lors d'une mise à jour**, à deux conditions :

- ne jamais changer l'adresse de l'app (le nom du dépôt `globe-voyages` et `BASE` dans `vite.config.ts`) : les données sont liées à l'adresse ;
- en cas de changement de structure des données, prévoir une migration (voir plus haut).

Par prudence, faire une sauvegarde avant une grosse modification.

## 6. Tests automatiques

```bash
npx playwright install webkit
npm run test:visual
```

30 tests vérifient l'app dans le moteur de Safari, en taille iPhone 15, en clair et en sombre : globe et drapeaux, voyages, carte, photos (EXIF, rattachement), budget, notes, wishlist, sauvegarde (export → import), guide PDF, îles et nations, calendrier, compagnons et migration des anciennes données. Les captures d'écran sont enregistrées dans `tests/screenshots/`.

## 7. Services gratuits utilisés et limites

Tout est gratuit, sans compte ni clé d'API :

| Service | Usage | Hors connexion |
|---|---|---|
| **Natural Earth** (frontières), **flag-icons** (drapeaux) | Globe | Embarqués dans l'app |
| **OpenFreeMap** | Fond de carte des itinéraires | Zones déjà consultées gardées en cache |
| **Nominatim** (OpenStreetMap) | Recherche de lieux (1 requête/s max, respecté par l'app) | Saisie manuelle du nom |
| **OSRM** | Tracé routier entre étapes (voiture) | Tracé enregistré avec l'étape ; ligne droite si indisponible |
| **Frankfurter** (taux BCE) | Conversion des dépenses en euros | Dernier taux connu, ou saisie manuelle |
| **GitHub Pages** | Hébergement de l'app | L'app entière est mise en cache sur l'appareil |

Limites connues :

- Le serveur OSRM gratuit ne calcule que des trajets en voiture : train, bateau, marche et vélo sont tracés en ligne droite, les vols en arc.
- Frankfurter couvre une trentaine de devises ; pour les autres (dong, dirham marocain…), le taux se saisit à la main.
- En choisissant des photos dans la Photothèque, Safari retire souvent leur position GPS. Pour la garder : Photos → Partager → Enregistrer dans Fichiers, puis importer depuis « Choisir un fichier ». Sinon, rattacher la photo à une étape à la main (aide intégrée dans l'onglet Photos).
- Le dépôt GitHub est public (obligatoire pour GitHub Pages gratuit) : **seul le code est visible**, jamais les données, qui restent sur l'appareil.

## 8. Dépannage

- **`npm` : « Could not read package.json »** → la commande a été lancée hors du dossier du projet : faire d'abord le `cd` de la section 3.
- **L'app ne se met pas à jour sur l'iPhone** → la fermer complètement (balayer vers le haut) et la rouvrir.
- **« Stockage protégé : Non »** → l'app est ouverte dans Safari et non depuis l'icône de l'écran d'accueil.
- **La carte d'un voyage est grise hors connexion** → la zone n'a jamais été affichée avec du réseau ; les étapes et tracés restent visibles dans la liste.
- **Le déploiement échoue** → onglet **Actions** du dépôt GitHub, ouvrir l'exécution en rouge pour lire l'erreur.
