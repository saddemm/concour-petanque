import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Met à jour un match de qualification.
 *
 * LOGIQUE D'ASSIGNATION IMMÉDIATE ET ALÉATOIRE:
 * - Dès qu'un match du Tour 1 se termine, le gagnant et le perdant sont
 *   immédiatement assignés à un slot aléatoire disponible dans le Tour 2
 * - Dès qu'un match du Tour 2 se termine, les équipes sont immédiatement
 *   assignées à un slot aléatoire disponible dans les Brackets
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id, matchId } = await params;
    const body = await request.json();
    const { winnerTeamId } = body;

    // Vérifier que le concours existe
    const contest = await prisma.contest.findUnique({
      where: { id },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Concours non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que le match existe et appartient au concours
    const match = await prisma.qualificationMatch.findUnique({
      where: { id: matchId },
      include: {
        round: true,
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match || match.round.contestId !== id) {
      return NextResponse.json(
        { error: 'Match non trouvé' },
        { status: 404 }
      );
    }

    if (match.isBye) {
      return NextResponse.json(
        { error: 'Impossible de modifier un match d\'exemption' },
        { status: 400 }
      );
    }

    // Valider que le gagnant est bien l'une des deux équipes
    if (!winnerTeamId) {
      return NextResponse.json(
        { error: 'ID de l\'équipe gagnante requis' },
        { status: 400 }
      );
    }

    if (winnerTeamId !== match.homeTeamId && winnerTeamId !== match.awayTeamId) {
      return NextResponse.json(
        { error: 'L\'équipe gagnante doit faire partie du match' },
        { status: 400 }
      );
    }

    // Déterminer le perdant
    const loserTeamId = winnerTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;

    // Mettre à jour le match
    const updatedMatch = await prisma.qualificationMatch.update({
      where: { id: matchId },
      data: {
        winnerTeamId,
        loserTeamId,
        status: 'FINISHED',
      },
      include: {
        homeTeam: { include: { players: true } },
        awayTeam: { include: { players: true } },
        winnerTeam: { include: { players: true } },
        loserTeam: { include: { players: true } },
        round: true,
      },
    });

    // ============================================================
    // ASSIGNATION IMMÉDIATE ET ALÉATOIRE
    // ============================================================

    if (match.round.roundNumber === 1) {
      // Assigner immédiatement le gagnant et le perdant au Tour 2
      await assignTeamToRound2Immediately(id, winnerTeamId, 'WINNERS');
      if (loserTeamId) {
        await assignTeamToRound2Immediately(id, loserTeamId, 'LOSERS');
      }
      // Vérifier et gérer les byes si le Tour 2 est complet
      await checkAndHandleRound2Completion(id);
    } else if (match.round.roundNumber === 2) {
      // Assigner immédiatement aux brackets
      const groupType = match.groupType;
      if (groupType === 'WINNERS') {
        // Gagnant → Bracket A, Perdant → Bracket B
        await assignTeamToBracketImmediately(id, winnerTeamId, 'A');
        if (loserTeamId) {
          await assignTeamToBracketImmediately(id, loserTeamId, 'B');
        }
      } else if (groupType === 'LOSERS') {
        // Gagnant → Bracket B, Perdant → Éliminé
        await assignTeamToBracketImmediately(id, winnerTeamId, 'B');
        if (loserTeamId) {
          await prisma.team.update({
            where: { id: loserTeamId },
            data: { status: 'ELIMINATED' },
          });
        }
      }
    }

    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error updating qualification match:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}

/**
 * Assigne immédiatement une équipe à un slot aléatoire disponible dans le Tour 2
 */
async function assignTeamToRound2Immediately(
  contestId: string,
  teamId: string,
  groupType: 'WINNERS' | 'LOSERS'
) {
  // Récupérer le Tour 2
  const round2 = await prisma.qualificationRound.findFirst({
    where: { contestId, roundNumber: 2 },
    include: { matches: true },
  });

  if (!round2) return;

  // Trouver tous les matchs du groupe avec des slots disponibles
  const availableMatches = round2.matches.filter(
    m => m.groupType === groupType && !m.isBye && m.status !== 'FINISHED'
  );

  // Collecter tous les slots disponibles
  const availableSlots: { matchId: string; slot: 'home' | 'away' }[] = [];

  for (const match of availableMatches) {
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

/**
 * Vérifie si le Tour 2 est complet et gère les byes si nécessaire
 */
async function checkAndHandleRound2Completion(contestId: string) {
  // Récupérer les tours
  const rounds = await prisma.qualificationRound.findMany({
    where: { contestId },
    include: { matches: true },
    orderBy: { roundNumber: 'asc' },
  });

  const round1 = rounds.find(r => r.roundNumber === 1);
  const round2 = rounds.find(r => r.roundNumber === 2);

  if (!round1 || !round2) return;

  // Vérifier si tous les matchs du Tour 1 sont terminés
  const allTour1Finished = round1.matches.every(m => m.status === 'FINISHED');
  if (!allTour1Finished) return;

  // Maintenant on peut nettoyer le Tour 2
  const freshMatches = await prisma.qualificationMatch.findMany({
    where: { roundId: round2.id },
  });

  // Supprimer les matchs complètement vides
  const emptyMatches = freshMatches.filter(
    m => !m.homeTeamId && !m.awayTeamId && !m.isBye
  );
  for (const match of emptyMatches) {
    await prisma.qualificationMatch.delete({
      where: { id: match.id },
    });
  }

  // Convertir les matchs avec une seule équipe en byes
  // Cas 1: homeTeam présent mais pas awayTeam
  // Cas 2: awayTeam présent mais pas homeTeam
  const incompleteMatches = freshMatches.filter(
    m => ((m.homeTeamId && !m.awayTeamId) || (!m.homeTeamId && m.awayTeamId))
         && !m.isBye && m.status !== 'FINISHED'
  );

  for (const match of incompleteMatches) {
    // Déterminer l'équipe présente
    const teamId = match.homeTeamId || match.awayTeamId;

    // Marquer comme bye et assigner immédiatement au tour suivant
    await prisma.qualificationMatch.update({
      where: { id: match.id },
      data: {
        isBye: true,
        homeTeamId: teamId, // S'assurer que l'équipe est en home pour cohérence
        awayTeamId: null,
        winnerTeamId: teamId,
        status: 'FINISHED',
      },
    });

    // Propager le gagnant du bye aux brackets
    if (teamId) {
      if (match.groupType === 'WINNERS') {
        await assignTeamToBracketImmediately(contestId, teamId, 'A');
      } else if (match.groupType === 'LOSERS') {
        await assignTeamToBracketImmediately(contestId, teamId, 'B');
      }
    }
  }

  // Vérifier si tous les matchs du Tour 2 sont terminés pour propager les gagnants aux brackets
  const updatedRound2Matches = await prisma.qualificationMatch.findMany({
    where: { roundId: round2.id },
  });

  const allTour2Finished = updatedRound2Matches.every(m => m.status === 'FINISHED');
  if (allTour2Finished) {
    // Propager tous les gagnants du Tour 2 qui ne sont pas encore dans les brackets
    for (const match of updatedRound2Matches) {
      if (match.winnerTeamId) {
        if (match.groupType === 'WINNERS') {
          await assignTeamToBracketImmediately(contestId, match.winnerTeamId, 'A');
        } else if (match.groupType === 'LOSERS') {
          await assignTeamToBracketImmediately(contestId, match.winnerTeamId, 'B');
        }
      }
      // Perdants du groupe LOSERS sont éliminés
      if (match.loserTeamId && match.groupType === 'LOSERS') {
        await prisma.team.update({
          where: { id: match.loserTeamId },
          data: { status: 'ELIMINATED' },
        });
      }
    }
  }
}

/**
 * Assigne immédiatement une équipe à un slot aléatoire disponible dans un Bracket
 *
 * NOUVELLE LOGIQUE avec matchs bye:
 * - Au premier tour, certains matchs sont des "byes" (status FINISHED, isBye true)
 * - Une équipe assignée à un match bye passe automatiquement au tour suivant
 * - On priorise les matchs non-bye du premier tour
 * - Si tous les matchs non-bye sont pleins, on assigne aux matchs bye (qui propagent au tour suivant)
 */
async function assignTeamToBracketImmediately(
  contestId: string,
  teamId: string,
  bracketType: 'A' | 'B'
) {
  // Récupérer le bracket
  const bracket = await prisma.bracket.findFirst({
    where: { contestId, type: bracketType },
    include: {
      rounds: {
        include: {
          matches: {
            include: { nextMatch: true },
            orderBy: { matchNumber: 'asc' },
          },
        },
        orderBy: { roundNumber: 'asc' },
      },
    },
  });

  if (!bracket || bracket.rounds.length === 0) return;

  // Vérifier si l'équipe est déjà dans le bracket
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (match.homeTeamId === teamId || match.awayTeamId === teamId) {
        return;
      }
    }
  }

  const firstRound = bracket.rounds[0];

  // Collecter les slots disponibles dans les matchs NON-BYE du premier tour
  const regularSlots: { matchId: string; slot: 'home' | 'away' }[] = [];
  // Et les slots dans les matchs BYE (pour les équipes exemptées)
  const byeSlots: { matchId: string; slot: 'home'; nextMatchId: string | null }[] = [];

  for (const match of firstRound.matches) {
    if (match.isBye) {
      // Match bye: on peut y placer une équipe qui passera automatiquement au tour suivant
      if (!match.homeTeamId) {
        byeSlots.push({ matchId: match.id, slot: 'home', nextMatchId: match.nextMatchId });
      }
    } else {
      // Match normal
      if (!match.homeTeamId) {
        regularSlots.push({ matchId: match.id, slot: 'home' });
      }
      if (!match.awayTeamId) {
        regularSlots.push({ matchId: match.id, slot: 'away' });
      }
    }
  }

  // Priorité 1: matchs normaux du premier tour
  if (regularSlots.length > 0) {
    const randomIndex = Math.floor(Math.random() * regularSlots.length);
    const chosenSlot = regularSlots[randomIndex];
    await prisma.bracketMatch.update({
      where: { id: chosenSlot.matchId },
      data: chosenSlot.slot === 'home' ? { homeTeamId: teamId } : { awayTeamId: teamId },
    });
    return;
  }

  // Priorité 2: matchs bye du premier tour
  // L'équipe placée dans un match bye passe automatiquement au tour suivant
  if (byeSlots.length > 0) {
    const randomIndex = Math.floor(Math.random() * byeSlots.length);
    const chosenSlot = byeSlots[randomIndex];

    // Mettre à jour le match bye avec l'équipe (elle est gagnante par défaut)
    await prisma.bracketMatch.update({
      where: { id: chosenSlot.matchId },
      data: {
        homeTeamId: teamId,
        winnerTeamId: teamId,
      },
    });

    // Propager l'équipe au match suivant
    if (chosenSlot.nextMatchId) {
      const nextMatch = await prisma.bracketMatch.findUnique({
        where: { id: chosenSlot.nextMatchId },
      });

      if (nextMatch) {
        if (!nextMatch.homeTeamId) {
          await prisma.bracketMatch.update({
            where: { id: nextMatch.id },
            data: { homeTeamId: teamId },
          });
        } else if (!nextMatch.awayTeamId) {
          await prisma.bracketMatch.update({
            where: { id: nextMatch.id },
            data: { awayTeamId: teamId },
          });
        }
      }
    }
    return;
  }

  // Fallback: chercher n'importe quel slot disponible dans les tours suivants
  for (let i = 1; i < bracket.rounds.length; i++) {
    const round = bracket.rounds[i];
    for (const match of round.matches) {
      if (match.status === 'FINISHED') continue;
      if (!match.homeTeamId) {
        await prisma.bracketMatch.update({
          where: { id: match.id },
          data: { homeTeamId: teamId },
        });
        return;
      }
      if (!match.awayTeamId) {
        await prisma.bracketMatch.update({
          where: { id: match.id },
          data: { awayTeamId: teamId },
        });
        return;
      }
    }
  }
}
