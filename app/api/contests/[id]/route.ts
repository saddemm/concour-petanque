import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/db';
import { z } from 'zod';

const updateContestSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
  teamType: z.enum(['TETE_A_TETE', 'DOUBLETTE', 'TRIPLETTE']).optional(),
  gameMode: z.enum(['MONTE', 'MELEE']).optional(),
  status: z.enum(['DRAFT', 'QUALIFICATION_ROUND_1', 'QUALIFICATION_ROUND_2', 'BRACKETS_GENERATED', 'FINISHED']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            players: { orderBy: { order: 'asc' } },
          },
          orderBy: { teamNumber: 'asc' },
        },
        qualificationRounds: {
          include: {
            matches: {
              include: {
                homeTeam: { include: { players: true } },
                awayTeam: { include: { players: true } },
                winnerTeam: { include: { players: true } },
                loserTeam: { include: { players: true } },
              },
              orderBy: { matchNumber: 'asc' },
            },
          },
          orderBy: { roundNumber: 'asc' },
        },
        brackets: {
          include: {
            rounds: {
              include: {
                matches: {
                  include: {
                    homeTeam: { include: { players: true } },
                    awayTeam: { include: { players: true } },
                    winnerTeam: true,
                  },
                  orderBy: { matchNumber: 'asc' },
                },
              },
              orderBy: { roundNumber: 'asc' },
            },
          },
        },
        players: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Concours non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(contest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du concours' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateContestSchema.parse(body);

    const updateData: any = { ...data };

    const contest = await prisma.contest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(contest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating contest:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du concours' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check contest exists first
    const contest = await prisma.contest.findUnique({ where: { id } });
    if (!contest) {
      return NextResponse.json({ error: 'Concours non trouvé' }, { status: 404 });
    }

    // Delete in order to avoid foreign key issues with self-referencing BracketMatch
    const brackets = await prisma.bracket.findMany({ where: { contestId: id }, select: { id: true } });
    const bracketIds = brackets.map(b => b.id);

    if (bracketIds.length > 0) {
      const rounds = await prisma.bracketRound.findMany({ where: { bracketId: { in: bracketIds } }, select: { id: true } });
      const roundIds = rounds.map(r => r.id);
      if (roundIds.length > 0) {
        // Clear self-references first, then delete matches
        await prisma.bracketMatch.updateMany({ where: { roundId: { in: roundIds } }, data: { nextMatchId: null } });
        await prisma.bracketMatch.deleteMany({ where: { roundId: { in: roundIds } } });
      }
      await prisma.bracketRound.deleteMany({ where: { bracketId: { in: bracketIds } } });
      await prisma.bracket.deleteMany({ where: { contestId: id } });
    }

    const qualRounds = await prisma.qualificationRound.findMany({ where: { contestId: id }, select: { id: true } });
    const qualRoundIds = qualRounds.map(r => r.id);
    if (qualRoundIds.length > 0) {
      await prisma.qualificationMatch.deleteMany({ where: { roundId: { in: qualRoundIds } } });
      await prisma.qualificationRound.deleteMany({ where: { contestId: id } });
    }

    await prisma.meleePlayer.deleteMany({ where: { contestId: id } });

    // Delete players via teams
    const teams = await prisma.team.findMany({ where: { contestId: id }, select: { id: true } });
    if (teams.length > 0) {
      await prisma.player.deleteMany({ where: { teamId: { in: teams.map(t => t.id) } } });
    }
    await prisma.team.deleteMany({ where: { contestId: id } });

    // Finally delete the contest
    await prisma.contest.delete({ where: { id } });

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contest:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du concours' },
      { status: 500 }
    );
  }
}
