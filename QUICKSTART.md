# Guide de démarrage rapide

## Lancer l'application

```bash
# 1. Démarrer le serveur (déjà fait)
npm run dev
```

L'application est accessible sur : **http://localhost:3000**

## Données de test disponibles

Le seed a créé 3 concours :

1. **Championnat de Printemps 2025** - 8 équipes en doublette (prêt pour le tirage)
2. **Tournoi d'Été 2025** - Aucune équipe (triplette)
3. **Test Concours Démo** - 6 équipes (prêt pour le tirage)

## Parcours de test recommandé

### Test 1 : Concours complet

1. Aller sur http://localhost:3000
2. Cliquer sur "Championnat de Printemps 2025"
3. Cliquer sur "Générer le tirage et lancer le concours"
4. Sur la page "Vue en direct", cliquer sur "Lancer le concours"
5. Cliquer sur chaque match pour saisir les résultats (ex: 13-5, 13-8, etc.)
6. Observer le classement se mettre à jour automatiquement
7. Une fois tous les matchs de poule terminés, cliquer sur "Générer les tableaux A et B"
8. Saisir les résultats des brackets
9. Clôturer le concours

### Test 2 : Créer un nouveau concours

1. Sur la page d'accueil, cliquer sur "Créer un concours"
2. Remplir les informations
3. Ajouter des équipes (minimum 3)
4. Générer le tirage
5. Suivre le déroulement du concours

## Explorer la base de données

```bash
npm run db:studio
```

Ouvre Prisma Studio sur http://localhost:5555 pour explorer et modifier la base de données.

## Tests

```bash
# Tests unitaires
npm run test

# Tests e2e (nécessite que le serveur soit lancé)
npm run test:e2e
```

## Fonctionnalités à tester

✅ Création de concours (TàT / Doublette / Triplette)
✅ Ajout/Suppression d'équipes
✅ Génération automatique du tirage
✅ Constitution des poules (3 ou 4 équipes)
✅ Saisie des résultats de poule
✅ Classements dynamiques
✅ Qualification automatique vers A et B
✅ Génération des brackets avec byes
✅ Progression automatique dans les brackets
✅ Clôture du concours

## Résolution de problèmes

Si vous rencontrez des erreurs :

1. Vérifier que la base de données est bien initialisée : `npm run db:push`
2. Vérifier que Prisma Client est généré : `npx prisma generate`
3. Redémarrer le serveur : Ctrl+C puis `npm run dev`
4. Vider le cache : supprimer `.next/` et relancer

## Prochaines améliorations possibles

- Export PDF des résultats
- Impression des tableaux
- Gestion des forfaits en cours de concours
- Historique des concours
- Statistiques par joueur/équipe
- Interface d'administration
- Mode multi-utilisateur avec authentification
