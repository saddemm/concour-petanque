'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TeamForm } from '@/components/TeamForm';
import { ArrowLeft, Users, Trash2, Play, Trophy, Target, Plus, Shuffle, UserPlus } from 'lucide-react';
import { BouleIcon, CochonnetIcon, TrophyPetanqueIcon, TriplettesIcon, DoubletteIcon, TeteATeteIcon } from '@/components/icons/PetanqueIcons';

interface Player {
  firstName: string;
}

interface Team {
  id: string;
  teamNumber: number;
  name?: string;
  club?: string;
  players: Player[];
}

interface MeleePlayer {
  id: string;
  name: string;
  createdAt: string;
}

interface Contest {
  id: string;
  name: string;
  teamType: 'TETE_A_TETE' | 'DOUBLETTE' | 'TRIPLETTE';
  gameMode: 'MONTE' | 'MELEE';
  status: string;
  teams: Team[];
  players: MeleePlayer[]; // Joueurs mélée
}

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

const teamTypeLabels: Record<string, string> = {
  TETE_A_TETE: 'Tête-à-tête',
  DOUBLETTE: 'Doublette',
  TRIPLETTE: 'Triplette',
};

export default function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  const fetchContest = async () => {
    try {
      const response = await fetch(`/api/contests/${id}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setContest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContest();
  }, [id]);

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Supprimer cette équipe ?')) return;

    try {
      const response = await fetch(`/api/contests/${id}/teams?teamId=${teamId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      fetchContest();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // Fonctions pour le mode Mélée
  const handleAddMeleePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setIsAddingPlayer(true);
    try {
      const response = await fetch(`/api/contests/${id}/melee-players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout');

      setNewPlayerName('');
      fetchContest();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleDeleteMeleePlayer = async (playerId: string) => {
    try {
      const response = await fetch(`/api/contests/${id}/melee-players?playerId=${playerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      fetchContest();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleGenerateDraw = async () => {
    if (!confirm('Générer le tirage ? Cette action est irréversible.')) return;

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch(`/api/contests/${id}/draw`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors du tirage');
      }

      router.push(`/concours/${id}/live`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTeamDisplay = (team: Team) => {
    if (team.name) return team.name;
    return team.players.map(p => p.firstName).join(' / ');
  };

  // Calcul du nombre de joueurs par équipe
  const getPlayersPerTeam = () => {
    if (!contest) return 2;
    switch (contest.teamType) {
      case 'TETE_A_TETE': return 1;
      case 'DOUBLETTE': return 2;
      case 'TRIPLETTE': return 3;
      default: return 2;
    }
  };

  // Nombre minimum de joueurs pour former au moins 3 équipes
  const getMinPlayers = () => getPlayersPerTeam() * 3;

  // Nombre d'équipes que l'on peut former avec les joueurs actuels
  const getPossibleTeams = () => {
    if (!contest) return 0;
    return Math.floor((contest.players?.length || 0) / getPlayersPerTeam());
  };

  // Vérifie si on peut lancer le tirage
  const canGenerateDraw = () => {
    if (!contest) return false;
    if (contest.gameMode === 'MELEE') {
      return getPossibleTeams() >= 3;
    }
    return contest.teams.length >= 3;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BouleIcon className="w-16 h-16 mx-auto text-gray-400 animate-bounce-slow" />
          <p className="text-gray-500 mt-4">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">!</div>
          <p className="text-red-600 font-semibold">Concours non trouvé</p>
          <Link href="/" className="text-[#2D5A27] hover:underline mt-4 inline-block">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = contest.status === 'DRAFT';

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="header-gradient text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <button className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <TeamTypeIcon type={contest.teamType} className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{contest.name}</h1>
                  <p className="text-white/80 text-sm">
                    {teamTypeLabels[contest.teamType]} • {contest.gameMode === 'MELEE' ? 'Mêlée' : 'Monté'} • Configuration
                  </p>
                </div>
              </div>
            </div>
            {contest.status !== 'DRAFT' && (
              <Link href={`/concours/${id}/live`}>
                <button className="btn-petanque flex items-center gap-2 bg-white/20 hover:bg-white/30">
                  <Trophy className="w-5 h-5" />
                  Voir le concours
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">!</div>
              {error}
            </div>
          )}

          {/* Card principale */}
          <div className="card-petanque overflow-hidden">
            {/* Header de la card */}
            <div className="bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="bg-white/20 p-2 rounded-xl">
                    {contest.gameMode === 'MELEE' ? <Shuffle className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {contest.gameMode === 'MELEE' ? 'Joueurs inscrits' : 'Équipes inscrites'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {contest.gameMode === 'MELEE'
                        ? `${contest.players?.length || 0} joueur${(contest.players?.length || 0) > 1 ? 's' : ''} • ${getPossibleTeams()} équipe${getPossibleTeams() > 1 ? 's' : ''} possible${getPossibleTeams() > 1 ? 's' : ''}`
                        : `${contest.teams.length} équipe${contest.teams.length > 1 ? 's' : ''} enregistrée${contest.teams.length > 1 ? 's' : ''}`
                      }
                    </p>
                  </div>
                </div>
                {canEdit && contest.gameMode === 'MONTE' && (
                  <TeamForm
                    contestId={id}
                    teamType={contest.teamType}
                    onTeamAdded={fetchContest}
                    nextTeamNumber={contest.teams.length + 1}
                  />
                )}
              </div>
            </div>

            {/* Contenu */}
            <div className="p-5">
              {/* MODE MÉLÉE - Liste des joueurs individuels */}
              {contest.gameMode === 'MELEE' && (
                <>
                  {/* Formulaire d'ajout de joueur */}
                  {canEdit && (
                    <form onSubmit={handleAddMeleePlayer} className="mb-6">
                      <div className="flex gap-3">
                        <Input
                          value={newPlayerName}
                          onChange={(e) => setNewPlayerName(e.target.value)}
                          placeholder="Nom du joueur"
                          className="flex-1"
                          disabled={isAddingPlayer}
                        />
                        <button
                          type="submit"
                          disabled={isAddingPlayer || !newPlayerName.trim()}
                          className="btn-petanque flex items-center gap-2 disabled:opacity-50"
                        >
                          <UserPlus className="w-5 h-5" />
                          Ajouter
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Liste des joueurs */}
                  {(!contest.players || contest.players.length === 0) ? (
                    <div className="empty-state">
                      <div className="flex justify-center gap-3 mb-4">
                        <BouleIcon className="w-12 h-12 text-gray-300" />
                        <CochonnetIcon className="w-8 h-8 text-amber-400 mt-2" />
                        <BouleIcon className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Aucun joueur inscrit</p>
                      <p className="text-gray-400 text-sm mt-1">Ajoutez des joueurs pour former les équipes aléatoirement</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {contest.players.map((player, index) => (
                        <div
                          key={player.id}
                          className="group p-3 bg-gradient-to-r from-white to-[#F5EFE0] rounded-xl border-2 border-[#E8DCC4] hover:border-[#2D5A27] transition-all duration-200 animate-fade-in flex items-center justify-between"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#2D5A27] text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium text-gray-800">{player.name}</span>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteMeleePlayer(player.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* MODE MONTÉ - Liste des équipes */}
              {contest.gameMode === 'MONTE' && (
                <>
                  {contest.teams.length === 0 ? (
                    <div className="empty-state">
                      <div className="flex justify-center gap-3 mb-4">
                        <BouleIcon className="w-12 h-12 text-gray-300" />
                        <CochonnetIcon className="w-8 h-8 text-amber-400 mt-2" />
                        <BouleIcon className="w-12 h-12 text-gray-400" />
                      </div>
                      <p className="text-gray-500">Aucune équipe inscrite</p>
                      <p className="text-gray-400 text-sm mt-1">Ajoutez des équipes pour commencer le concours</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contest.teams.map((team, index) => (
                        <div
                          key={team.id}
                          className="group p-4 bg-gradient-to-r from-white to-[#F5EFE0] rounded-xl border-2 border-[#E8DCC4] hover:border-[#2D5A27] transition-all duration-200 animate-fade-in"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="team-number team-number-lg">
                                {team.teamNumber}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800 text-lg">
                                  {getTeamDisplay(team)}
                                </div>
                                {team.club && (
                                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    {team.club}
                                  </div>
                                )}
                              </div>
                            </div>
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteTeam(team.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Actions - Génération du tirage */}
              {canEdit && canGenerateDraw() && (
                <div className="mt-8 pt-6 border-t-2 border-[#E8DCC4]">
                  <button
                    onClick={handleGenerateDraw}
                    disabled={isGenerating}
                    className="w-full btn-petanque flex items-center justify-center gap-3 text-lg py-4 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <BouleIcon className="w-6 h-6 animate-roll" />
                        Génération en cours...
                      </>
                    ) : (
                      <>
                        {contest.gameMode === 'MELEE' ? <Shuffle className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        {contest.gameMode === 'MELEE'
                          ? 'Mélanger les équipes et lancer le concours'
                          : 'Générer le tirage et lancer le concours'
                        }
                      </>
                    )}
                  </button>
                  <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-sm">
                    <Target className="w-4 h-4" />
                    <span>
                      {contest.gameMode === 'MELEE'
                        ? `${contest.players?.length || 0} joueurs → ${getPossibleTeams()} équipes aléatoires`
                        : `${contest.teams.length} équipes prêtes • Le tirage créera automatiquement les poules`
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Message si pas assez de joueurs/équipes */}
              {canEdit && !canGenerateDraw() && (
                <div className="mt-6 pt-6 border-t-2 border-[#E8DCC4]">
                  <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <CochonnetIcon className="w-6 h-6" />
                    </div>
                    <div>
                      {contest.gameMode === 'MELEE' ? (
                        <>
                          <p className="text-amber-800 font-medium">
                            Encore {getMinPlayers() - (contest.players?.length || 0)} joueur{(getMinPlayers() - (contest.players?.length || 0)) > 1 ? 's' : ''} nécessaire{(getMinPlayers() - (contest.players?.length || 0)) > 1 ? 's' : ''}
                          </p>
                          <p className="text-amber-600 text-sm">
                            Minimum {getMinPlayers()} joueurs pour former 3 {teamTypeLabels[contest.teamType].toLowerCase()}s
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-amber-800 font-medium">
                            Encore {3 - contest.teams.length} équipe{3 - contest.teams.length > 1 ? 's' : ''} nécessaire{3 - contest.teams.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-amber-600 text-sm">Minimum 3 équipes pour générer le tirage</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MapPin({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
