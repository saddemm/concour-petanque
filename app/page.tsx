import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BouleIcon, CochonnetIcon, TrophyPetanqueIcon } from '@/components/icons/PetanqueIcons';
import { ContestCard } from '@/components/ContestCard';

import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getContests() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        _count: { select: { teams: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return contests;
  } catch (error) {
    console.error('Error fetching contests:', error);
    return [];
  }
}

export default async function HomePage() {
  const contests = await getContests();

  return (
    <div className="min-h-screen">
      {/* Header avec gradient */}
      <header className="header-gradient text-white shadow-lg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <TrophyPetanqueIcon className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Concours Pétanque</h1>
                <p className="text-white/80 mt-1">Gérez vos tournois facilement</p>
              </div>
            </div>
            <Link href="/concours/new">
              <button className="btn-petanque flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                <Plus className="w-5 h-5" />
                Créer un concours
              </button>
            </Link>
          </div>
        </div>

        {/* Décoration boules */}
        <div className="absolute top-4 right-[20%] opacity-10">
          <BouleIcon className="w-24 h-24" color="white" />
        </div>
        <div className="absolute bottom-2 left-[10%] opacity-10">
          <CochonnetIcon className="w-16 h-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {contests.length === 0 ? (
          <div className="empty-state max-w-2xl mx-auto">
            <div className="flex justify-center gap-4 mb-6">
              <BouleIcon className="w-16 h-16 text-gray-400 animate-bounce-slow" />
              <CochonnetIcon className="w-12 h-12 text-amber-600 mt-4" />
              <BouleIcon className="w-16 h-16 text-gray-500 animate-bounce-slow" style={{ animationDelay: '0.5s' }} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Aucun concours</h2>
            <p className="text-gray-500 mb-8">Créez votre premier concours pour commencer à gérer vos tournois de pétanque</p>
            <Link href="/concours/new">
              <button className="btn-petanque inline-flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Créer votre premier concours
              </button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Vos concours ({contests.length})
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contests.map((contest: any, index: number) => (
                <ContestCard key={contest.id} contest={contest} index={index} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer décoratif */}
      <footer className="mt-auto py-8 text-center text-gray-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BouleIcon className="w-4 h-4 text-gray-400" />
          <span>Concours Pétanque</span>
          <CochonnetIcon className="w-4 h-4" />
        </div>
        <p>Gérez vos tournois avec passion</p>
      </footer>
    </div>
  );
}
