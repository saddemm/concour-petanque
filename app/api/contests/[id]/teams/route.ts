import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

const playerSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  order: z.number().int().min(1).max(3),
});

const createTeamSchema = z.object({
  players: z.array(playerSchema).min(1).max(3),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = createTeamSchema.parse(body);

    // Vérifier que le concours existe et est en mode DRAFT
    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true } },
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
        { error: 'Impossible d\'ajouter des équipes après le tirage' },
        { status: 400 }
      );
    }

    // Vérifier le nombre de joueurs selon le type
    const expectedPlayers =
      contest.teamType === 'TETE_A_TETE' ? 1 :
      contest.teamType === 'DOUBLETTE' ? 2 : 3;

    if (data.players.length !== expectedPlayers) {
      return NextResponse.json(
        { error: `Une équipe ${contest.teamType} doit avoir ${expectedPlayers} joueur(s)` },
        { status: 400 }
      );
    }

    // Trouver le prochain numéro d'équipe disponible
    const lastTeam = await prisma.team.findFirst({
      where: { contestId: id },
      orderBy: { teamNumber: 'desc' },
      select: { teamNumber: true },
    });
    const teamNumber = (lastTeam?.teamNumber ?? 0) + 1;

    // Créer l'équipe avec les joueurs (on stocke name dans firstName pour compatibilité)
    const team = await prisma.team.create({
      data: {
        contestId: id,
        teamNumber,
        players: {
          create: data.players.map(p => ({
            firstName: p.name,
            lastName: '',
            order: p.order,
          })),
        },
      },
      include: {
        players: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'équipe' },
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
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId requis' },
        { status: 400 }
      );
    }

    // Vérifier que le concours est en mode DRAFT
    const contest = await prisma.contest.findUnique({
      where: { id },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Concours non trouvé' },
        { status: 404 }
      );
    }

    if (contest.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Impossible de supprimer des équipes après le tirage' },
        { status: 400 }
      );
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'équipe' },
      { status: 500 }
    );
  }
}
