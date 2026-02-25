import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { z } from 'zod';

const createContestSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  location: z.string().optional().default(''),
  teamType: z.enum(['TETE_A_TETE', 'DOUBLETTE', 'TRIPLETTE']),
  gameMode: z.enum(['MONTE', 'MELEE']).default('MONTE'),
});

export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        _count: {
          select: { teams: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des concours' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createContestSchema.parse(body);

    const contest = await prisma.contest.create({
      data: {
        name: data.name,
        location: data.location || null,
        teamType: data.teamType,
        gameMode: data.gameMode,
      },
    });

    return NextResponse.json(contest, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating contest:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du concours' },
      { status: 500 }
    );
  }
}
