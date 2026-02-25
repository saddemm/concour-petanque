# CLAUDE.md — Concours Petanque

## Ce que fait ce projet

Application web de **gestion de concours de petanque** avec systeme de poules, qualifications et tableaux A/B. Supporte les modes Monte (equipes pre-formees) et Melee (tirage au sort).

### Stack technique

| Element | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| ORM | Prisma 5 |
| Base de donnees | SQLite |
| CSS | Tailwind CSS 3 |
| UI | Composants custom (Pico-inspired) |
| Tests | Vitest (unit) + Playwright (e2e) |

### Structure

```
concour-petanque/
  app/
    page.tsx                    # Page d'accueil — liste des concours
    layout.tsx                  # Layout global
    globals.css                 # Styles Tailwind + custom
    concours/
      new/page.tsx              # Creation d'un nouveau concours
      [id]/setup/page.tsx       # Configuration equipes + tirage
      [id]/live/page.tsx        # Vue live du concours (matchs, brackets)
    api/
      contests/
        route.ts                # GET (liste) + POST (creation)
        [id]/route.ts           # GET + PATCH + DELETE (cascade manuelle)
        [id]/teams/route.ts     # CRUD equipes
        [id]/draw/route.ts      # Tirage au sort (qualifications + brackets)
        [id]/melee-players/route.ts  # Joueurs mode Melee
        [id]/qualification-matches/[matchId]/route.ts  # Scores qualif
        [id]/bracket-matches/[matchId]/route.ts        # Scores brackets
  components/
    ContestCard.tsx             # Card concours (avec bouton supprimer)
    TeamForm.tsx                # Formulaire ajout equipes
    QualificationRound.tsx      # Affichage tours de qualification
    BracketTree.tsx             # Arbre des brackets A/B
    icons/PetanqueIcons.tsx     # Icones SVG custom
    ui/                         # Composants UI generiques (button, card, input, modal)
  lib/
    algorithms.ts               # Algorithmes de tirage et generation brackets
    db.ts                       # Instance Prisma singleton
    types.ts                    # Types TypeScript
    utils.ts                    # Utilitaires (cn, etc.)
  prisma/
    schema.prisma               # Schema DB (Contest, Team, Player, Match, Bracket...)
    seed.ts                     # Script de seed (obsolete, exclure du build)
    dev.db                      # Base SQLite (gitignored)
  scripts/                      # Scripts de test Python
  tests/                        # Tests unitaires et e2e
```

### Modeles de donnees principaux

- **Contest** : concours avec nom, type (tete-a-tete/doublette/triplette), mode (monte/melee), statut
- **Team** : equipe liee a un concours, avec joueurs
- **Player** / **MeleePlayer** : joueurs (en equipe ou individuels)
- **QualificationRound** / **QualificationMatch** : tours de qualif (1 et 2)
- **Bracket** / **BracketRound** / **BracketMatch** : tableaux A/B avec progression

### Fonctionnalites

1. **Creation concours** : choix du type (1v1, 2v2, 3v3) et mode (monte/melee)
2. **Gestion equipes** : ajout/suppression d'equipes et joueurs
3. **Tirage au sort** : generation automatique des matchs de qualification
4. **Qualifications** : 2 tours avec groupes gagnants/perdants
5. **Brackets A/B** : tableaux a elimination directe avec progression automatique
6. **Vue live** : suivi en temps reel des matchs et resultats
7. **Suppression** : cascade manuelle (BracketMatch self-ref → nullify nextMatchId d'abord)

## VPS Production

| Element | Valeur |
|---|---|
| **URL** | http://51.255.206.239:8001 |
| **SSH** | `ssh vps` (alias dans ~/.ssh/config) |
| **Host** | ubuntu@51.255.206.239 |
| **Dossier** | `/home/ubuntu/concour` |
| **Runtime** | Node.js v20 + Next.js 15 |
| **Port** | 8001 |
| **DB** | SQLite (`prisma/dev.db`) |
| **Process** | nohup (pas de systemd) |
| **Log** | `/tmp/concour_web.log` |
| **Deploy key SSH** | `~/.ssh/id_ed25519_concour` (Host: `github-concour`) |
| **Git remote VPS** | `git@github-concour:saddemm/concour-petanque.git` |

### Commandes VPS

```bash
# Voir les logs
ssh vps 'cat /tmp/concour_web.log'

# Redemarrer l'app
ssh vps 'fuser -k 8001/tcp 2>/dev/null; sleep 2; cd ~/concour && nohup npm start -- -p 8001 > /tmp/concour_web.log 2>&1 &'

# Deployer (pull + rebuild + restart)
ssh vps 'cd ~/concour && git pull origin main && npm install && npx prisma generate && npm run build && fuser -k 8001/tcp 2>/dev/null; sleep 2 && nohup npm start -- -p 8001 > /tmp/concour_web.log 2>&1 &'

# Arreter
ssh vps 'fuser -k 8001/tcp'
```

### SSH Config VPS (pour le repo concour-petanque)

```
# Dans ~/.ssh/config sur le VPS
Host github-concour
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_concour
    IdentitiesOnly yes
```

## Developpement local

```bash
# Installer les dependances
npm install

# Generer le client Prisma
npx prisma generate

# Initialiser la DB
npx prisma db push

# Lancer en dev
npm run dev

# Build production
npm run build

# Tests
npm test              # Vitest
npm run test:e2e      # Playwright
```

## Conventions

- **Langue** : Interface en francais, code/variables en anglais
- **Page d'accueil** : `export const dynamic = 'force-dynamic'` (pas de cache Next.js)
- **Suppression** : cascade manuelle dans le DELETE handler (pas de `prisma.contest.delete()` seul — self-referencing BracketMatch.nextMatchId bloque la cascade SQLite)
- **revalidatePath('/')** : apres chaque mutation pour rafraichir la liste
- **tsconfig.json** : exclure `prisma/seed.ts`, `scripts/`, `tests/` du build (seed a des types obsoletes)

## Pieges connus

- **BracketMatch self-reference** : `nextMatchId` pointe vers un autre BracketMatch. SQLite ne gere pas bien le `onDelete: Cascade` avec des self-refs. Solution : nullifier `nextMatchId` avant de supprimer.
- **Deploy keys GitHub** : chaque repo a sa propre deploy key sur le VPS. Utiliser le Host alias SSH (`github-concour`) pour distinguer.
- **Next.js cache en production** : les Server Components sont caches par defaut. Utiliser `dynamic = 'force-dynamic'` sur les pages qui doivent toujours etre fraiches.
- **seed.ts obsolete** : le schema a evolue mais le seed non. L'exclure du tsconfig pour eviter les erreurs de build.
- **Port 8001** : le firewall UFW doit avoir `ufw allow 8001/tcp`.
