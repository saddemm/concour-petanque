#!/usr/bin/env npx tsx

/**
 * Script pour générer des équipes de test
 * Usage: npx tsx scripts/generate-teams.ts <nomConcours> <nombreEquipes> [type]
 *
 * Exemple: npx tsx scripts/generate-teams.ts "Mon Tournoi" 16
 * Exemple: npx tsx scripts/generate-teams.ts "Mon Tournoi" 16 TRIPLETTE
 *
 * Types disponibles: TETE_A_TETE, DOUBLETTE (défaut), TRIPLETTE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Prénoms pour générer des noms aléatoires
const PRENOMS = [
  'Jean', 'Pierre', 'Marie', 'Sophie', 'Luc', 'Claire', 'Paul', 'Julie',
  'Marc', 'Anne', 'Thomas', 'Emma', 'Nicolas', 'Laura', 'David', 'Céline',
  'Michel', 'Isabelle', 'Philippe', 'Nathalie', 'Alain', 'Véronique', 'Eric', 'Christine',
  'Patrick', 'Sandrine', 'Christophe', 'Sylvie', 'Thierry', 'Catherine', 'Olivier', 'Martine',
  'Bruno', 'Monique', 'Didier', 'Françoise', 'Pascal', 'Valérie', 'Gérard', 'Dominique',
  'Jacques', 'Brigitte', 'André', 'Jacqueline', 'René', 'Danielle', 'Daniel', 'Josiane',
  'Bernard', 'Chantal', 'Robert', 'Michèle', 'Marcel', 'Jeanne', 'Louis', 'Yvonne',
  'Henri', 'Marguerite', 'Georges', 'Simone', 'Roger', 'Paulette', 'Maurice', 'Germaine'
];

function getRandomPrenom(): string {
  return PRENOMS[Math.floor(Math.random() * PRENOMS.length)];
}

function getUniquePrenom(usedPrenoms: Set<string>): string {
  let prenom = getRandomPrenom();
  let attempts = 0;

  while (usedPrenoms.has(prenom) && attempts < 100) {
    prenom = getRandomPrenom();
    attempts++;
  }

  if (usedPrenoms.has(prenom)) {
    let counter = 2;
    while (usedPrenoms.has(`${prenom}${counter}`)) {
      counter++;
    }
    prenom = `${prenom}${counter}`;
  }

  usedPrenoms.add(prenom);
  return prenom;
}

async function generateTeams(contestName: string, count: number, teamType: string) {
  console.log(`\n🎯 Génération de ${count} équipes pour "${contestName}"\n`);

  // Chercher ou créer le concours
  let contest = await prisma.contest.findFirst({
    where: { name: contestName },
    include: {
      _count: { select: { teams: true } },
    },
  });

  if (!contest) {
    console.log(`📝 Création du concours "${contestName}"...`);
    contest = await prisma.contest.create({
      data: {
        name: contestName,
        location: 'Boulodrome',
        teamType: teamType as 'TETE_A_TETE' | 'DOUBLETTE' | 'TRIPLETTE',
        gameMode: 'MONTE',
        status: 'DRAFT',
      },
      include: {
        _count: { select: { teams: true } },
      },
    });
    console.log(`✅ Concours créé avec l'ID: ${contest.id}\n`);
  } else {
    if (contest.status !== 'DRAFT') {
      console.error('❌ Le concours existe mais n\'est pas en statut DRAFT');
      process.exit(1);
    }
    console.log(`📋 Concours existant trouvé (${contest._count.teams} équipes)\n`);
  }

  // Déterminer le nombre de joueurs par équipe
  const playersPerTeam =
    contest.teamType === 'TETE_A_TETE' ? 1 :
    contest.teamType === 'DOUBLETTE' ? 2 : 3;

  console.log(`🎮 Type: ${contest.teamType} (${playersPerTeam} joueur(s) par équipe)`);
  console.log('');

  const usedPrenoms = new Set<string>();
  let startNumber = contest._count.teams + 1;

  for (let i = 0; i < count; i++) {
    const teamNumber = startNumber + i;

    // Générer les joueurs
    const players: string[] = [];
    for (let j = 0; j < playersPerTeam; j++) {
      players.push(getUniquePrenom(usedPrenoms));
    }

    const teamName = players.join(' / ');

    await prisma.team.create({
      data: {
        contestId: contest.id,
        teamNumber: teamNumber,
        name: teamName,
        players: {
          create: players.map((name, idx) => ({
            firstName: name,
            lastName: '',
            order: idx + 1,
          })),
        },
      },
    });

    console.log(`  ✅ Équipe ${teamNumber}: ${teamName}`);
  }

  console.log(`\n🎉 ${count} équipes créées avec succès !`);
  console.log(`📊 Total équipes: ${contest._count.teams + count}`);
  console.log(`\n🔗 ID du concours: ${contest.id}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n📋 Concours disponibles:\n');
    const contests = await prisma.contest.findMany({
      include: {
        _count: { select: { teams: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (contests.length === 0) {
      console.log('  Aucun concours trouvé.');
    } else {
      contests.forEach(c => {
        const statusEmoji = c.status === 'DRAFT' ? '📝' : '🔒';
        console.log(`  ${statusEmoji} ${c.name}`);
        console.log(`     ID: ${c.id}`);
        console.log(`     ${c._count.teams} équipes - ${c.teamType} - ${c.status}`);
        console.log('');
      });
    }

    console.log('Usage: npx tsx scripts/generate-teams.ts <nomConcours> <nombreEquipes> [type]');
    console.log('');
    console.log('Exemples:');
    console.log('  npx tsx scripts/generate-teams.ts "Mon Tournoi" 16');
    console.log('  npx tsx scripts/generate-teams.ts "Tournoi Triplette" 12 TRIPLETTE');
    console.log('');
    console.log('Types: TETE_A_TETE, DOUBLETTE (défaut), TRIPLETTE');
    process.exit(0);
  }

  if (args.length < 2) {
    console.error('❌ Arguments manquants');
    console.log('Usage: npx tsx scripts/generate-teams.ts <nomConcours> <nombreEquipes> [type]');
    process.exit(1);
  }

  const contestName = args[0];
  const count = parseInt(args[1], 10);
  const teamType = args[2]?.toUpperCase() || 'DOUBLETTE';

  if (isNaN(count) || count < 1) {
    console.error('❌ Le nombre d\'équipes doit être un entier positif');
    process.exit(1);
  }

  if (count > 200) {
    console.error('❌ Maximum 200 équipes à la fois');
    process.exit(1);
  }

  if (!['TETE_A_TETE', 'DOUBLETTE', 'TRIPLETTE'].includes(teamType)) {
    console.error('❌ Type invalide. Utilisez: TETE_A_TETE, DOUBLETTE ou TRIPLETTE');
    process.exit(1);
  }

  await generateTeams(contestName, count, teamType);
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
