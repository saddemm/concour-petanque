'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Users, Trash2, X, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { BouleIcon, TeteATeteIcon, DoubletteIcon, TriplettesIcon } from '@/components/icons/PetanqueIcons';

interface ContestCardProps {
  contest: {
    id: string;
    name: string;
    date: string;
    location: string;
    teamType: string;
    status: string;
    _count: { teams: number };
  };
  index: number;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  QUALIFICATION_ROUND_1: 'Tour 1',
  QUALIFICATION_ROUND_2: 'Tour 2',
  BRACKETS_GENERATED: 'Phase finale',
  FINISHED: 'Terminé',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border border-gray-300',
  QUALIFICATION_ROUND_1: 'bg-blue-100 text-blue-800 border border-blue-300',
  QUALIFICATION_ROUND_2: 'bg-amber-100 text-amber-800 border border-amber-300',
  BRACKETS_GENERATED: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
  FINISHED: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
};

const teamTypeLabels: Record<string, string> = {
  TETE_A_TETE: 'Tête-à-tête',
  DOUBLETTE: 'Doublette',
  TRIPLETTE: 'Triplette',
};

function TeamTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'TETE_A_TETE':
      return <TeteATeteIcon className={className} />;
    case 'DOUBLETTE':
      return <DoubletteIcon className={className} />;
    case 'TRIPLETTE':
      return <TriplettesIcon className={className} />;
    default:
      return <BouleIcon className={className} />;
  }
}

export function ContestCard({ contest, index }: ContestCardProps) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contests/${contest.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteModal(false);
        router.refresh();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      alert('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className="card-petanque overflow-hidden cursor-pointer animate-fade-in relative group"
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        {/* Bouton suppression */}
        <button
          onClick={handleDelete}
          className="absolute top-2 right-2 z-10 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
          title="Supprimer le concours"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <Link href={`/concours/${contest.id}/setup`}>
          {/* Header de la carte */}
          <div className="bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <TeamTypeIcon type={contest.teamType} className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{contest.name}</h3>
                  <p className="text-white/70 text-sm">{teamTypeLabels[contest.teamType]}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contenu de la carte */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`badge-status ${statusColors[contest.status]}`}>
                {statusLabels[contest.status]}
              </span>
              <div className="flex items-center gap-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="font-semibold">{contest._count.teams}</span>
                <span className="text-sm">équipes</span>
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-600 gap-2">
              <Calendar className="w-4 h-4 text-[#2D5A27]" />
              <span>{formatDate(contest.date)}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600 gap-2">
              <MapPin className="w-4 h-4 text-[#2D5A27]" />
              <span>{contest.location}</span>
            </div>

            {/* Barre de progression visuelle */}
            <div className="pt-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] transition-all duration-500"
                  style={{
                    width: contest.status === 'DRAFT' ? '10%' :
                           contest.status === 'QUALIFICATION_ROUND_1' ? '35%' :
                           contest.status === 'QUALIFICATION_ROUND_2' ? '60%' :
                           contest.status === 'BRACKETS_GENERATED' ? '85%' :
                           '100%'
                  }}
                />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Modal de confirmation */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                Supprimer le concours ?
              </h3>

              <p className="text-gray-600 text-center mb-2">
                <span className="font-semibold">{contest.name}</span>
              </p>

              <p className="text-sm text-gray-500 text-center mb-6">
                Cette action est irréversible. Toutes les équipes, matchs et résultats seront définitivement supprimés.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <BouleIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
