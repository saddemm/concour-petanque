import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateQualificationRound1, buildBracket } from '@/lib/algorithms';

// Helper pour calculer le nombre de joueurs par équipe
function getPlayersPerTeam(teamType: string): number {
  switch (teamType) {
    case 'TETE_A_TETE': return 1;
    case 'DOUBLETTE': return 2;
    case 'TRIPLETTE': return 3;
    default: return 2;
  }
}

/**
 * Génère le tirage complet du concours:
 * - Tour 1 de qualification (matchs générés)
 * - Tour 2 de qualification (structure créée, matchs vides en attente des résultats du Tour 1)
 * - Brackets A et B (structure créée, matchs vides en attente des qualifications)
 *
 * Cela permet de jouer les matchs en parallèle sans attendre la fin de chaque tour.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        teams: {
          where: { status: 'REGISTERED' },
          include: { players: true },
        },
        players: true, // Joueurs mélée
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Concours non trouvé' },
        { status: 404 }
      );
    }

    if (contest.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Le tirage a déjà été effectué' },
        { status: 400 }
      );
    }

    // Mode MELEE: créer les équipes aléatoirement à partir des joueurs
    let teams = contest.teams;

    if (contest.gameMode === 'MELEE') {
      const meleePlayers = contest.players || [];
      const playersPerTeam = getPlayersPerTeam(contest.teamType);
      const numTeams = Math.floor(meleePlayers.length / playersPerTeam);

      if (numTeams < 3) {
        return NextResponse.json(
          { error: `Au moins ${playersPerTeam * 3} joueurs sont nécessaires pour former 3 équipes` },
          { status: 400 }
        );
      }

      // Mélanger les joueurs aléatoirement
      const shuffledPlayers = [...meleePlayers].sort(() => Math.random() - 0.5);

      // Créer les équipes
      const createdTeams = [];
      for (let i = 0; i < numTeams; i++) {
        const teamPlayers = shuffledPlayers.slice(i * playersPerTeam, (i + 1) * playersPerTeam);

        // Générer le nom de l'équipe à partir des joueurs
        const teamName = teamPlayers.map(p => p.name).join(' & ');

        const team = await prisma.team.create({
          data: {
            contestId: id,
            name: teamName,
            teamNumber: i + 1,
            players: {
              create: teamPlayers.map((p, idx) => ({
                firstName: p.name,
                lastName: '',
                order: idx + 1,
              })),
            },
          },
          include: { players: true },
        });

        createdTeams.push(team);
      }

      teams = createdTeams;
    }

    if (teams.length < 3) {
      return NextResponse.json(
        { error: 'Au moins 3 équipes sont nécessaires' },
        { status: 400 }
      );
    }

    const n = teams.length;

    // ============================================================
    // TOUR 1 DE QUALIFICATION
    // ============================================================
    const round1Matches = generateQualificationRound1(teams);

    const qualificationRound1 = await prisma.qualificationRound.create({
      data: {
        contestId: id,
        roundNumber: 1,
      },
    });

    // Créer les matchs du Tour 1
    for (const match of round1Matches) {
      await prisma.qualificationMatch.create({
        data: {
          roundId: qualificationRound1.id,
          matchNumber: match.matchNumber,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId || null,
          isBye: match.isBye,
          status: match.isBye ? 'FINISHED' : 'SCHEDULED',
          winnerTeamId: match.isBye ? match.homeTeamId : null,
        },
      });
    }

    // ============================================================
    // TOUR 2 DE QUALIFICATION (structure vide)
    // ============================================================
    // Calculer le nombre de matchs du Tour 2
    // Gagnants du Tour 1: ceil(n/2) équipes
    // Perdants du Tour 1: floor(n/2) équipes
    const winnersCount = Math.ceil(n / 2);
    const losersCount = Math.floor(n / 2);

    // Matchs pour les gagnants
    const winnersMatchCount = Math.ceil(winnersCount / 2);
    const winnersByeCount = winnersMatchCount * 2 - winnersCount;

    // Matchs pour les perdants
    const losersMatchCount = Math.ceil(losersCount / 2);
    const losersByeCount = losersMatchCount * 2 - losersCount;

    const qualificationRound2 = await prisma.qualificationRound.create({
      data: {
        contestId: id,
        roundNumber: 2,
      },
    });

    let matchNumber = 1;

    // Matchs des gagnants (vides, seront remplis automatiquement)
    for (let i = 0; i < winnersMatchCount; i++) {
      await prisma.qualificationMatch.create({
        data: {
          roundId: qualificationRound2.id,
          matchNumber: matchNumber++,
          groupType: 'WINNERS',
          isBye: false,
          status: 'SCHEDULED',
        },
      });
    }

    // Matchs des perdants (vides, seront remplis automatiquement)
    for (let i = 0; i < losersMatchCount; i++) {
      await prisma.qualificationMatch.create({
        data: {
          roundId: qualificationRound2.id,
          matchNumber: matchNumber++,
          groupType: 'LOSERS',
          isBye: false,
          status: 'SCHEDULED',
        },
      });
    }

    // Propager immédiatement les byes du Tour 1 au Tour 2
    const byeMatches = round1Matches.filter(m => m.isBye);
    for (const byeMatch of byeMatches) {
      if (byeMatch.homeTeamId) {
        await assignTeamToRound2Slot(qualificationRound2.id, byeMatch.homeTeamId, 'WINNERS');
      }
    }

    // ============================================================
    // BRACKETS A ET B (structure vide)
    // ============================================================
    // Concours A: équipes avec 2 victoires (environ n/4)
    // Concours B: équipes avec 1 victoire (environ n/2)

    // Pour créer les brackets, on utilise des équipes "placeholder"
    // qui seront remplacées par les vrais qualifiés

    // Estimation du nombre de qualifiés
    // Tour 1: ceil(n/2) gagnants, floor(n/2) perdants
    // Tour 2 Winners: ceil(winnersCount/2) gagnants → A, reste → B
    // Tour 2 Losers: ceil(losersCount/2) gagnants → B, reste → éliminés

    const estimatedQualifiedA = Math.ceil(winnersCount / 2);
    const estimatedQualifiedB = (winnersCount - estimatedQualifiedA) + Math.ceil(losersCount / 2);

    // Créer Bracket A
    await createEmptyBracket(id, 'A', estimatedQualifiedA);

    // Créer Bracket B
    await createEmptyBracket(id, 'B', estimatedQualifiedB);

    // ============================================================
    // METTRE À JOUR LE STATUT
    // ============================================================
    await prisma.contest.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    return NextResponse.json({
      success: true,
      tour1Matches: round1Matches.length,
      tour2WinnersMatches: winnersMatchCount,
      tour2LosersMatches: losersMatchCount,
      estimatedQualifiedA,
      estimatedQualifiedB,
    });
  } catch (error) {
    console.error('Error generating draw:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors du tirage' },
      { status: 500 }
    );
  }
}

/**
 * Crée un bracket vide avec la structure correcte pour un nombre donné d'équipes
 *
 * ALGORITHME STANDARD:
 * - On crée un bracket de taille nextPower (prochaine puissance de 2 >= n)
 * - Les n équipes sont placées, les (nextPower - n) positions restantes sont des byes
 * - Au 1er tour, certains matchs sont des byes (une équipe passe automatiquement)
 * - Les équipes qui jouent contre un bye sont avancées au tour suivant
 *
 * Structure:
 * - nextPower/2 matchs au 1er tour
 * - nextPower/4 matchs au 2ème tour
 * - etc. jusqu'à la finale
 */
async function createEmptyBracket(contestId: string, type: 'A' | 'B', numTeams: number) {
  if (numTeams < 1) {
    return;
  }

  // Cas spécial: 1 seule équipe = victoire automatique
  if (numTeams === 1) {
    const bracket = await prisma.bracket.create({
      data: { contestId, type },
    });

    const finaleRound = await prisma.bracketRound.create({
      data: {
        bracketId: bracket.id,
        roundNumber: 1,
        roundName: 'Finale',
      },
    });

    await prisma.bracketMatch.create({
      data: {
        roundId: finaleRound.id,
        matchNumber: 1,
        isBye: true,
        status: 'SCHEDULED',
      },
    });

    return;
  }

  // Cas spécial: 2 équipes = juste une finale
  if (numTeams === 2) {
    const bracket = await prisma.bracket.create({
      data: { contestId, type },
    });

    const finaleRound = await prisma.bracketRound.create({
      data: {
        bracketId: bracket.id,
        roundNumber: 1,
        roundName: 'Finale',
      },
    });

    await prisma.bracketMatch.create({
      data: {
        roundId: finaleRound.id,
        matchNumber: 1,
        isBye: false,
        status: 'SCHEDULED',
      },
    });

    return;
  }

  // Calculer la taille du bracket
  const nextPower = nextPowerOfTwo(numTeams);
  const numByes = nextPower - numTeams;
  const totalRounds = Math.log2(nextPower);

  const bracket = await prisma.bracket.create({
    data: { contestId, type },
  });

  // Créer tous les rounds
  let matchesInRound = nextPower / 2;
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const roundName = getRoundName(roundNum, totalRounds);
    const round = await prisma.bracketRound.create({
      data: {
        bracketId: bracket.id,
        roundNumber: roundNum,
        roundName,
      },
    });

    // Au premier tour, marquer les derniers matchs comme byes
    // Les byes sont placés à la fin pour que les équipes exemptées soient en haut du bracket
    for (let i = 0; i < matchesInRound; i++) {
      const isByeMatch = roundNum === 1 && i >= (matchesInRound - numByes);
      await prisma.bracketMatch.create({
        data: {
          roundId: round.id,
          matchNumber: i + 1,
          isBye: isByeMatch,
          status: isByeMatch ? 'FINISHED' : 'SCHEDULED',
        },
      });
    }

    matchesInRound /= 2;
  }

  // Établir les liens nextMatchId
  await setupBracketLinks(bracket.id);
}

/**
 * Configure les liens nextMatchId entre les matchs d'un bracket
 * Règle standard: 2 matchs consécutifs alimentent 1 match du tour suivant
 */
async function setupBracketLinks(bracketId: string) {
  const rounds = await prisma.bracketRound.findMany({
    where: { bracketId },
    include: { matches: { orderBy: { matchNumber: 'asc' } } },
    orderBy: { roundNumber: 'asc' },
  });

  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];

    // Règle standard: 2 matchs → 1 match suivant
    for (let j = 0; j < currentRound.matches.length; j++) {
      const currentMatch = currentRound.matches[j];
      const nextMatchIndex = Math.floor(j / 2);
      const nextMatch = nextRound.matches[nextMatchIndex];

      if (nextMatch) {
        await prisma.bracketMatch.update({
          where: { id: currentMatch.id },
          data: { nextMatchId: nextMatch.id },
        });
      }
    }
  }
}

/**
 * Assigne une équipe à un slot aléatoire disponible dans le Tour 2
 */
async function assignTeamToRound2Slot(
  round2Id: string,
  teamId: string,
  groupType: 'WINNERS' | 'LOSERS'
) {
  // Trouver tous les matchs du groupe avec des slots disponibles
  const matches = await prisma.qualificationMatch.findMany({
    where: { roundId: round2Id, groupType },
  });

  // Collecter tous les slots disponibles
  const availableSlots: { matchId: string; slot: 'home' | 'away' }[] = [];

  for (const match of matches) {
    if (match.isBye || match.status === 'FINISHED') continue;
    if (!match.homeTeamId) {
      availableSlots.push({ matchId: match.id, slot: 'home' });
    }
    if (!match.awayTeamId) {
      availableSlots.push({ matchId: match.id, slot: 'away' });
    }
  }

  if (availableSlots.length === 0) return;

  // Choisir un slot aléatoire
  const randomIndex = Math.floor(Math.random() * availableSlots.length);
  const chosenSlot = availableSlots[randomIndex];

  // Assigner l'équipe au slot choisi
  await prisma.qualificationMatch.update({
    where: { id: chosenSlot.matchId },
    data: chosenSlot.slot === 'home' ? { homeTeamId: teamId } : { awayTeamId: teamId },
  });
}

function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

function getRoundName(roundNumber: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNumber + 1;

  if (fromEnd === 1) return 'Finale';
  if (fromEnd === 2) return 'Demi-finales';
  if (fromEnd === 3) return 'Quarts de finale';
  if (fromEnd === 4) return 'Huitièmes de finale';

  return `Tour ${roundNumber}`;
}
