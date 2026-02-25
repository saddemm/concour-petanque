import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  try {
    const { id, matchId } = await params;
    const body = await request.json();
    const { winnerTeamId } = body;

    // Vérifier que le match existe
    const match = await prisma.bracketMatch.findUnique({
      where: { id: matchId },
      include: {
        round: {
          include: {
            bracket: {
              include: {
                contest: true,
              },
            },
          },
        },
        homeTeam: true,
        awayTeam: true,
        nextMatch: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match non trouvé' },
        { status: 404 }
      );
    }

    if (match.round.bracket.contestId !== id) {
      return NextResponse.json(
        { error: 'Match non associé à ce concours' },
        { status: 400 }
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
    const updatedMatch = await prisma.bracketMatch.update({
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
        nextMatch: true,
      },
    });

    // Propager le vainqueur au match suivant
    if (updatedMatch.nextMatch && updatedMatch.winnerTeamId) {
      // Récupérer le match suivant avec ses données actuelles
      const nextMatch = await prisma.bracketMatch.findUnique({
        where: { id: updatedMatch.nextMatch.id },
      });

      if (nextMatch) {
        // Déterminer le slot disponible dans le match suivant
        // Priorité: si HOME est vide, utiliser HOME; sinon utiliser AWAY
        let updateData: { homeTeamId?: string; awayTeamId?: string };

        if (!nextMatch.homeTeamId) {
          updateData = { homeTeamId: updatedMatch.winnerTeamId };
        } else if (!nextMatch.awayTeamId) {
          updateData = { awayTeamId: updatedMatch.winnerTeamId };
        } else {
          // Les deux slots sont déjà pris, ne rien faire (ne devrait pas arriver)
          console.warn(`Match ${nextMatch.id} already has both teams assigned`);
          return NextResponse.json(updatedMatch);
        }

        await prisma.bracketMatch.update({
          where: { id: nextMatch.id },
          data: updateData,
        });
      }
    }

    return NextResponse.json(updatedMatch);
  } catch (error) {
    console.error('Error updating bracket match:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' },
      { status: 500 }
    );
  }
}
