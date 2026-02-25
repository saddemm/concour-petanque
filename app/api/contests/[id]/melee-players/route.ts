import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

const addPlayerSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
});

// GET - Récupérer tous les joueurs mélée d'un concours
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const players = await prisma.meleePlayer.findMany({
      where: { contestId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching melee players:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des joueurs' },
      { status: 500 }
    );
  }
}

// POST - Ajouter un joueur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = addPlayerSchema.parse(body);

    // Vérifier que le concours existe et est en mode MELEE
    const contest = await prisma.contest.findUnique({
      where: { id },
    });

    if (!contest) {
      return NextResponse.json(
        { error: 'Concours non trouvé' },
        { status: 404 }
      );
    }

    if (contest.gameMode !== 'MELEE') {
      return NextResponse.json(
        { error: 'Ce concours n\'est pas en mode mélée' },
        { status: 400 }
      );
    }

    if (contest.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Impossible d\'ajouter des joueurs une fois le concours lancé' },
        { status: 400 }
      );
    }

    const player = await prisma.meleePlayer.create({
      data: {
        contestId: id,
        name: data.name,
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error adding melee player:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du joueur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un joueur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'ID du joueur requis' },
        { status: 400 }
      );
    }

    // Vérifier que le concours est en DRAFT
    const contest = await prisma.contest.findUnique({
      where: { id },
    });

    if (!contest || contest.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un joueur' },
        { status: 400 }
      );
    }

    await prisma.meleePlayer.delete({
      where: { id: playerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting melee player:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du joueur' },
      { status: 500 }
    );
  }
}
