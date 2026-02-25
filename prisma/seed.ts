import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed...');

  // Nettoyer la base de données (dans le bon ordre pour les foreign keys)
  await prisma.bracketMatch.deleteMany();
  await prisma.bracketRound.deleteMany();
  await prisma.bracket.deleteMany();
  await prisma.qualificationMatch.deleteMany();
  await prisma.qualificationRound.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.contest.deleteMany();

  console.log('✅ Base de données nettoyée');

  // Créer un concours de test
  const contest = await prisma.contest.create({
    data: {
      name: 'Championnat de Printemps 2025',
      date: new Date('2025-04-15'),
      location: 'Boulodrome Municipal',
      teamType: 'DOUBLETTE',
      winningPoints: 13,
      status: 'DRAFT',
    },
  });

  console.log(`✅ Concours créé: ${contest.name}`);

  // Créer 8 équipes de test
  const teamData = [
    { name: 'Jean / Marie', club: 'AS Pétanque Paris' },
    { name: 'Pierre / Sophie', club: 'Club Boules Lyon' },
    { name: 'Luc / Claire', club: 'AS Pétanque Paris' },
    { name: 'Paul / Julie', club: 'Pétanque Club Marseille' },
    { name: 'Marc / Anne', club: 'Club Boules Lyon' },
    { name: 'Thomas / Emma', club: 'Pétanque Club Marseille' },
    { name: 'Nicolas / Laura', club: 'AS Pétanque Paris' },
    { name: 'David / Céline', club: 'Club Boules Lyon' },
  ];

  for (let i = 0; i < teamData.length; i++) {
    const names = teamData[i].name.split(' / ');
    await prisma.team.create({
      data: {
        contestId: contest.id,
        teamNumber: i + 1,
        name: teamData[i].name,
        club: teamData[i].club,
        players: {
          create: names.map((name, idx) => ({
            firstName: name,
            lastName: '',
            order: idx + 1,
          })),
        },
      },
    });
  }

  console.log(`✅ ${teamData.length} équipes créées`);

  // Créer un second concours (vide)
  const contest2 = await prisma.contest.create({
    data: {
      name: 'Tournoi d\'Été 2025',
      date: new Date('2025-07-20'),
      location: 'Parc des Sports',
      teamType: 'TRIPLETTE',
      winningPoints: 13,
      status: 'DRAFT',
    },
  });

  console.log(`✅ Second concours créé: ${contest2.name}`);

  // Créer un troisième concours avec 6 équipes
  const contest3 = await prisma.contest.create({
    data: {
      name: 'Test Concours Démo',
      date: new Date('2025-05-01'),
      location: 'Terrain Municipal',
      teamType: 'DOUBLETTE',
      winningPoints: 13,
      status: 'DRAFT',
    },
  });

  // Créer 6 équipes pour ce concours
  for (let i = 0; i < 6; i++) {
    await prisma.team.create({
      data: {
        contestId: contest3.id,
        teamNumber: i + 1,
        name: `Équipe Test ${i + 1}`,
        players: {
          create: [
            { firstName: `Joueur A${i + 1}`, lastName: '', order: 1 },
            { firstName: `Joueur B${i + 1}`, lastName: '', order: 2 },
          ],
        },
      },
    });
  }

  console.log(`✅ Concours démo créé avec 6 équipes`);

  console.log('\n🎉 Seed terminé avec succès!');
  console.log('\n📋 Résumé:');
  console.log(`   - ${await prisma.contest.count()} concours`);
  console.log(`   - ${await prisma.team.count()} équipes`);
  console.log(`   - ${await prisma.player.count()} joueurs`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
