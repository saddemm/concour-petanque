'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { QualificationRound } from '@/components/QualificationRound';
import { BracketTree } from '@/components/BracketTree';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { BouleIcon, CochonnetIcon, TrophyPetanqueIcon } from '@/components/icons/PetanqueIcons';

interface Contest {
  id: string;
  name: string;
  status: string;
  qualificationRounds: any[];
  brackets: any[];
  teams: any[];
}

export default function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contest, setContest] = useState<Contest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleFinishContest = async () => {
    if (!confirm('Clôturer définitivement le concours ?')) return;

    try {
      await fetch(`/api/contests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FINISHED' }),
      });
      fetchContest();
    } catch (err) {
      alert('Erreur lors de la clôture');
    }
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

  // Trouver les tours de qualification
  const round1 = contest.qualificationRounds?.find((r: any) => r.roundNumber === 1);
  const round2 = contest.qualificationRounds?.find((r: any) => r.roundNumber === 2);

  // Vérifier si tous les matchs d'un tour sont terminés
  const isRoundComplete = (round: any) => {
    if (!round) return false;
    return round.matches.every((m: any) => m.status === 'FINISHED' || m.isBye);
  };

  const round1Complete = isRoundComplete(round1);
  const round2Complete = isRoundComplete(round2);

  // Brackets
  const bracketA = contest.brackets?.find((b: any) => b.type === 'A');
  const bracketB = contest.brackets?.find((b: any) => b.type === 'B');

  // Logique d'affichage - avec le nouveau système IN_PROGRESS
  // Tout est généré dès le tirage, donc on affiche tout si le concours est en cours
  const isInProgress = contest.status === 'IN_PROGRESS';
  const isFinished = contest.status === 'FINISHED';

  const showRound1 = (isInProgress || isFinished) && round1 !== undefined;
  const showRound2 = (isInProgress || isFinished) && round2 !== undefined;
  const showBrackets = (isInProgress || isFinished) && (bracketA !== undefined || bracketB !== undefined);

  // Plus besoin de boutons pour générer le Tour 2 ou les brackets
  // car tout est généré automatiquement au tirage

  const allBracketMatchesFinished = (bracket: any) => {
    if (!bracket) return true;
    return bracket.rounds.every((round: any) =>
      round.matches.every((match: any) => match.status === 'FINISHED' || match.isBye)
    );
  };

  const canFinish =
    showBrackets &&
    contest.status !== 'FINISHED' &&
    allBracketMatchesFinished(bracketA) &&
    allBracketMatchesFinished(bracketB);

  // Équipes éliminées
  const eliminatedTeams = contest.teams?.filter((t: any) => t.status === 'ELIMINATED') || [];

  const getStatusLabel = () => {
    switch (contest.status) {
      case 'IN_PROGRESS':
        return 'En cours';
      case 'FINISHED':
        return 'Terminé';
      case 'DRAFT':
        return 'Brouillon';
      default:
        return contest.status;
    }
  };

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
                  <TrophyPetanqueIcon className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{contest.name}</h1>
                  <p className="text-white/80 text-sm">{getStatusLabel()}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {canFinish && (
                <button
                  onClick={handleFinishContest}
                  className="btn-petanque flex items-center gap-2 bg-white/20 hover:bg-white/30"
                >
                  <CheckCircle className="w-5 h-5" />
                  Clôturer
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">
              !
            </div>
            {error}
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Phase de qualification */}
          {(showRound1 || showRound2) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <CochonnetIcon className="w-8 h-8 text-amber-500" />
                <h2 className="text-2xl font-bold text-gray-800">Tours de qualification</h2>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Tour 1 */}
                {showRound1 && round1 && (
                  <QualificationRound
                    roundNumber={1}
                    matches={round1.matches}
                    allTeams={contest.teams}
                    onMatchUpdate={fetchContest}
                    contestId={id}
                    canEdit={isInProgress}
                  />
                )}

                {/* Tour 2 */}
                {showRound2 && round2 && (
                  <QualificationRound
                    roundNumber={2}
                    matches={round2.matches}
                    allTeams={contest.teams}
                    onMatchUpdate={fetchContest}
                    contestId={id}
                    canEdit={isInProgress}
                  />
                )}
              </div>
            </div>
          )}

          {/* Tableaux A et B */}
          {showBrackets && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <TrophyPetanqueIcon className="w-8 h-8" />
                <h2 className="text-2xl font-bold text-gray-800">Tableaux finaux</h2>
              </div>

              {/* Afficher les équipes éliminées */}
              {eliminatedTeams.length > 0 && (
                <div className="p-4 bg-gray-100 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-700">
                      Équipes éliminées ({eliminatedTeams.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {eliminatedTeams.map((team: any) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-200"
                      >
                        <div className="team-number text-xs w-5 h-5 bg-gray-400">
                          {team.teamNumber}
                        </div>
                        <span className="text-sm text-gray-600">
                          {team.name || team.players?.map((p: any) => p.firstName).join(' / ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bracketA && (
                <BracketTree
                  type="A"
                  rounds={bracketA.rounds}
                  allTeams={contest.teams}
                  onMatchUpdate={fetchContest}
                  contestId={id}
                  canEdit={contest.status !== 'FINISHED'}
                />
              )}

              {bracketB && (
                <BracketTree
                  type="B"
                  rounds={bracketB.rounds}
                  allTeams={contest.teams}
                  onMatchUpdate={fetchContest}
                  contestId={id}
                  canEdit={contest.status !== 'FINISHED'}
                />
              )}

              {canFinish && (
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                  <p className="text-green-800 font-medium mb-4">
                    Tous les matchs sont terminés !
                  </p>
                  <button onClick={handleFinishContest} className="btn-petanque text-lg py-3 px-8">
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Clôturer le concours
                  </button>
                </div>
              )}

              {contest.status === 'FINISHED' && (
                <div className="p-6 bg-gradient-to-r from-[#FEF3C7] via-[#FDE68A] to-[#FEF3C7] border-2 border-[#D4AF37] rounded-xl text-center">
                  <TrophyPetanqueIcon className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-bold text-[#92400E] mb-2">Concours terminé !</p>
                  <p className="text-[#92400E]/80">
                    Félicitations aux gagnants des concours A et B.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
