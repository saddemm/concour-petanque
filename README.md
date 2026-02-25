# Gestion Concours Petanque

Application web complete de gestion de concours de petanque avec systeme de double elimination et tableaux A/B.

## Fonctionnalites

- **Creation de concours** : Tete-a-tete, Doublette ou Triplette
- **Gestion des equipes** : Inscription avec numeros automatiques
- **Tirage automatique** : Generation complete du tournoi (Tour 1, Tour 2, Brackets A/B)
- **Tours de qualification** : Systeme de double elimination
- **Tableaux A et B** :
  - Concours A : equipes avec 2 victoires (gagnants des 2 tours)
  - Concours B : equipes avec 1 victoire (1 victoire + 1 defaite)
  - Elimination des equipes avec 0 victoire
- **Assignation immediate et aleatoire** : Les equipes sont assignees en temps reel aux matchs suivants
- **Vue en direct** : Suivi en temps reel du deroulement du concours

## Regles du format

### Systeme de qualification (Double elimination)

Le tournoi utilise un systeme de double elimination sur 2 tours :

#### Tour 1
- Toutes les equipes jouent (tirage au sort aleatoire)
- Les equipes sont reparties en matchs de 2
- Si nombre impair : une equipe est **exemptee** (consideree gagnante)

#### Tour 2
- Les **gagnants du Tour 1** jouent entre eux (groupe WINNERS)
- Les **perdants du Tour 1** jouent entre eux (groupe LOSERS)
- Si nombre impair dans un groupe : une equipe est exemptee
- **Regle anti-double exemption** : une equipe exemptee au Tour 1 ne peut PAS etre exemptee au Tour 2

#### Qualification finale
| Resultat Tour 1 | Resultat Tour 2 | Destination |
|-----------------|-----------------|-------------|
| Victoire | Victoire | **Concours A** |
| Victoire | Defaite | **Concours B** |
| Defaite | Victoire | **Concours B** |
| Defaite | Defaite | **Elimine** |

### Assignation immediate et aleatoire

Une caracteristique unique de ce systeme :

1. **Assignation en temps reel** : Des qu'un match du Tour 1 se termine, le gagnant et le perdant sont **immediatement** assignes a un slot aleatoire disponible dans le Tour 2
2. **Visibilite immediate** : L'arbitre peut voir en temps reel les matchs du Tour 2 se remplir
3. **Matchs prets a jouer** : Un match est pret des que les 2 adversaires sont assignes (affichage en gras)
4. **Meme logique pour les Brackets** : Les equipes du Tour 2 sont propagees immediatement vers les Brackets A/B

### Tableaux A et B

- Elimination directe
- Si le nombre d'equipes n'est pas une puissance de 2, un tour preliminaire est cree avec des exempts (byes)
- Les equipes exemptees passent automatiquement au tour suivant
- Progression automatique des vainqueurs

## Installation

### Prerequis
- Node.js 18+
- npm ou pnpm

### Etapes

1. **Cloner le projet**
```bash
cd /home/sanane/Bureau/dev/Concour
```

2. **Installer les dependances**
```bash
npm install
```

3. **Initialiser la base de donnees**
```bash
npm run db:push
```

4. **Peupler avec des donnees de test (optionnel)**
```bash
npm run db:seed
```

5. **Lancer le serveur de developpement**
```bash
npm run dev
```

6. **Ouvrir l'application**
```
http://localhost:3000
```

## Scripts disponibles

- `npm run dev` : Lance le serveur de developpement
- `npm run build` : Compile l'application pour la production
- `npm run start` : Lance le serveur de production
- `npm run lint` : Verifie le code avec ESLint
- `npm run test` : Lance les tests unitaires (Vitest)
- `npm run db:push` : Synchronise le schema Prisma avec la base de donnees
- `npm run db:seed` : Peuple la base avec des donnees de test
- `npm run db:studio` : Ouvre Prisma Studio pour explorer la base de donnees

## Architecture technique

### Stack
- **Framework** : Next.js 15 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Base de donnees** : SQLite (dev) avec Prisma ORM
- **Validation** : Zod

### Structure du projet

```
/
|-- app/                          # Pages Next.js (App Router)
|   |-- api/                      # API Routes
|   |   |-- contests/             # Endpoints des concours
|   |   |   |-- [id]/
|   |   |       |-- draw/         # Generation du tirage
|   |   |       |-- qualification-matches/  # Matchs de qualification
|   |   |       |-- bracket-matches/        # Matchs de brackets
|   |-- concours/                 # Pages des concours
|   |   |-- new/                  # Creation d'un concours
|   |   |-- [id]/                 # Pages dynamiques
|   |       |-- setup/            # Configuration et inscription
|   |       |-- live/             # Vue en direct
|   |-- globals.css               # Styles globaux
|   |-- layout.tsx                # Layout principal
|   |-- page.tsx                  # Page d'accueil (dashboard)
|-- components/                   # Composants React
|   |-- BracketTree.tsx           # Arbre d'elimination
|   |-- QualificationRound.tsx    # Composant tour de qualification
|   |-- icons/                    # Icones personnalisees
|-- lib/                          # Bibliotheques et utilitaires
|   |-- algorithms.ts             # Algorithmes metier
|   |-- db.ts                     # Client Prisma
|-- prisma/                       # Configuration Prisma
|   |-- schema.prisma             # Schema de base de donnees
|-- scripts/                      # Scripts de test
    |-- full-test-v2.py           # Test complet automatise
```

### Modele de donnees

Le schema Prisma definit :
- `Contest` : Concours (statuts: DRAFT, IN_PROGRESS, FINISHED)
- `Team` : Equipes (statuts: REGISTERED, ELIMINATED)
- `Player` : Joueurs d'une equipe
- `QualificationRound` : Tour de qualification (1 ou 2)
- `QualificationMatch` : Match de qualification (avec groupType: WINNERS/LOSERS)
- `Bracket` : Tableau A ou B
- `BracketRound` : Tour d'un tableau
- `BracketMatch` : Match d'un tableau

## Guide d'utilisation

### 1. Creer un concours
1. Cliquer sur "Creer un concours" depuis la page d'accueil
2. Remplir les informations : nom, date, lieu, type (TaT/Doublette/Triplette), points gagnants
3. Cliquer sur "Creer le concours"

### 2. Inscrire les equipes
1. Sur la page de configuration, cliquer sur "Ajouter une equipe"
2. Saisir les informations des joueurs (selon le type de concours)
3. Optionnel : ajouter un nom d'equipe et un club
4. Repeter jusqu'a avoir au moins 4 equipes

### 3. Generer le tirage
1. Une fois les equipes inscrites (minimum 4), cliquer sur "Generer le tirage"
2. Le systeme genere automatiquement :
   - Tour 1 de qualification (matchs avec les equipes)
   - Tour 2 de qualification (structure vide, se remplit au fur et a mesure)
   - Brackets A et B (structure vide, se remplit apres le Tour 2)

### 4. Saisir les resultats du Tour 1
1. Sur la page "Vue en direct", les matchs du Tour 1 s'affichent
2. Pour saisir un resultat :
   - **Methode rapide** : Entrer le numero de l'equipe gagnante et confirmer
   - **Methode par clic** : Cliquer sur le match puis sur l'equipe gagnante
3. Les equipes sont **immediatement** assignees au Tour 2 :
   - Le gagnant va dans un slot aleatoire du groupe WINNERS
   - Le perdant va dans un slot aleatoire du groupe LOSERS
4. Dans le Tour 2, les matchs prets (2 adversaires) s'affichent en **gras**

### 5. Saisir les resultats du Tour 2
1. Les matchs jouables du Tour 2 s'affichent au fur et a mesure
2. Saisir les resultats comme pour le Tour 1
3. Les equipes sont propagees vers les Brackets :
   - WINNERS gagnant -> Bracket A
   - WINNERS perdant -> Bracket B
   - LOSERS gagnant -> Bracket B
   - LOSERS perdant -> Elimine

### 6. Jouer les Brackets A et B
1. Les tableaux se remplissent automatiquement
2. Saisir les resultats des matchs de bracket
3. Les vainqueurs progressent automatiquement vers le tour suivant

### 7. Finaliser le concours
1. Une fois toutes les finales terminees, cliquer sur "Cloturer le concours"
2. Les champions des Concours A et B sont affiches

## API Routes

Toutes les routes API suivent les conventions REST :

### Concours
- `GET /api/contests` : Liste des concours
- `POST /api/contests` : Creer un concours
- `GET /api/contests/[id]` : Details d'un concours
- `PATCH /api/contests/[id]` : Mettre a jour un concours
- `DELETE /api/contests/[id]` : Supprimer un concours

### Equipes
- `POST /api/contests/[id]/teams` : Ajouter une equipe
- `DELETE /api/contests/[id]/teams/[teamId]` : Supprimer une equipe

### Tirage
- `POST /api/contests/[id]/draw` : Generer le tirage complet (Tour 1, Tour 2, Brackets)

### Matchs de qualification
- `PATCH /api/contests/[id]/qualification-matches/[matchId]` : Saisir resultat
  - Body: `{ "winnerTeamId": "uuid" }`
  - Effet: Assigne immediatement les equipes au tour suivant

### Matchs de bracket
- `PATCH /api/contests/[id]/bracket-matches/[matchId]` : Saisir resultat
  - Body: `{ "winnerTeamId": "uuid" }`
  - Effet: Propage le vainqueur au match suivant

## Tests

### Tests unitaires (Vitest)

Les tests unitaires couvrent tous les algorithmes metier (679 tests) pour les concours modes Monte et Melee, de 10 a 120 equipes (pairs et impairs).

```bash
# Lancer tous les tests (10-120 equipes)
npm test

# Tester un nombre specifique d'equipes
TEAM_COUNT=25 npm test

# Tester une plage d'equipes
TEAM_MIN=20 TEAM_MAX=40 npm test

# Exemples
TEAM_COUNT=59 npm test           # Seulement 59 equipes
TEAM_MIN=50 TEAM_MAX=60 npm test # De 50 a 60 equipes
TEAM_MIN=100 TEAM_MAX=120 npm test # De 100 a 120 equipes
```

#### Couverture des tests

| Categorie | Description |
|-----------|-------------|
| Tour 1 - Pairs | Verification des matchs pour nombres pairs (10-120) |
| Tour 1 - Impairs | Verification du bye pour nombres impairs (11-119) |
| Tour 2 | Separation Winners/Losers |
| Qualification | Distribution des equipes vers A/B/elimine |
| Brackets A et B | Construction et structure des tableaux |
| Melee Doublette/Triplette | Formation d'equipes aleatoires |
| Cas limites | Min/max equipes, puissances de 2, anti-double exemption |
| Performance | Generation < 100ms pour 120 equipes |

### Script de test automatise (E2E API)

```bash
python3 scripts/full-test-v2.py <nombre_equipes>
```

Exemple :
```bash
python3 scripts/full-test-v2.py 9    # Test avec 9 equipes
python3 scripts/full-test-v2.py 32   # Test avec 32 equipes
```

Ce script :
1. Cree un concours
2. Inscrit les equipes
3. Genere le tirage
4. Joue tous les matchs de qualification
5. Joue tous les matchs de brackets
6. Affiche les resultats
7. Supprime le concours de test

## Configuration

### Variables d'environnement

Creer un fichier `.env` a la racine :

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_URL="http://localhost:3000"
```

### Base de donnees

L'application utilise SQLite en developpement. Pour la production, modifier `prisma/schema.prisma` pour utiliser PostgreSQL ou MySQL.

## Notes techniques

### Algorithmes implementes

1. **generateQualificationRound1** : Genere les matchs du Tour 1 avec gestion des exemptions
2. **assignTeamToRound2Immediately** : Assigne une equipe a un slot aleatoire du Tour 2
3. **assignTeamToBracketImmediately** : Assigne une equipe a un slot aleatoire du Bracket
4. **checkAndHandleRound2Completion** : Gere les byes quand le Tour 1 est termine
5. **buildBracket** : Construit un arbre d'elimination avec byes

### Gestion des etats

Le concours passe par les etats :
- `DRAFT` : Saisie des equipes
- `IN_PROGRESS` : Tournoi en cours (Tour 1, Tour 2, Brackets)
- `FINISHED` : Concours termine

### Flux de donnees

```
Tour 1 termine
    |
    v
+---+---+
|       |
v       v
WINNERS LOSERS
(Tour 2)(Tour 2)
    |       |
    v       v
+---+---+   +---+---+
|       |   |       |
v       v   v       v
Bracket Bracket Elimine
   A       B
```

## Licence

Ce projet est sous licence MIT.

## Credits

Developpe pour la gestion de concours de petanque selon un format de double elimination avec tableaux A/B.
