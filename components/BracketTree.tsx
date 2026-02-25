'use client';

import { useState } from 'react';
import { Trophy, Crown, X, Check, Search } from 'lucide-react';
import { BouleIcon, TrophyPetanqueIcon } from '@/components/icons/PetanqueIcons';

interface Player {
  firstName: string;
}

interface Team {
  id: string;
  teamNumber: number;
  name?: string;
  players: Player[];
}

interface Match {
  id: string;
  matchNumber: number;
  homeTeam?: Team;
  awayTeam?: Team;
  winnerTeamId?: string;
  status: string;
  isBye: boolean;
}

interface Round {
  roundNumber: number;
  roundName: string;
  matches: Match[];
}

interface BracketTreeProps {
  type: 'A' | 'B';
  rounds: Round[];
  allTeams: Team[];
  onMatchUpdate: () => void;
  contestId: string;
  canEdit: boolean;
}

export function BracketTree({ type, rounds, allTeams, onMatchUpdate, contestId, canEdit }: BracketTreeProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [pendingWinner, setPendingWinner] = useState<Team | null>(null);
  const [pendingMatch, setPendingMatch] = useState<Match | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [quickInput, setQuickInput] = useState('');

  const handleMatchClick = (match: Match) => {
    if (!canEdit || !match.homeTeam || !match.awayTeam || match.isBye || match.status === 'FINISHED') return;
    setSelectedMatch(match);
    setError('');
  };

  const handleSelectWinner = (team: Team, match: Match) => {
    setPendingWinner(team);
    setPendingMatch(match);
    setSelectedMatch(null);
  };

  const handleConfirmWinner = async () => {
    if (!pendingWinner || !pendingMatch) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/contests/${contestId}/bracket-matches/${pendingMatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerTeamId: pendingWinner.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      setPendingWinner(null);
      setPendingMatch(null);
      setQuickInput('');
      onMatchUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setPendingWinner(null);
    setPendingMatch(null);
  };

  // Recherche rapide par numéro d'équipe
  const handleQuickInputChange = (value: string) => {
    setQuickInput(value);
    setError('');

    if (!value) return;

    const teamNumber = parseInt(value);
    if (isNaN(teamNumber)) return;

    // Trouver l'équipe par son numéro
    const team = allTeams.find(t => t.teamNumber === teamNumber);
    if (!team) {
      setError(`Équipe ${teamNumber} non trouvée`);
      return;
    }

    // Trouver le match en cours contenant cette équipe
    const match = findMatchByTeamNumber(teamNumber);
    if (!match) {
      setError(`L'équipe ${teamNumber} n'a pas de match en cours dans ce tableau`);
      return;
    }

    // Afficher la confirmation
    setPendingWinner(team);
    setPendingMatch(match);
  };

  const findMatchByTeamNumber = (teamNumber: number): Match | null => {
    for (const round of rounds) {
      for (const match of round.matches) {
        if (match.status !== 'FINISHED' && !match.isBye && match.homeTeam && match.awayTeam) {
          if (match.homeTeam.teamNumber === teamNumber || match.awayTeam.teamNumber === teamNumber) {
            return match;
          }
        }
      }
    }
    return null;
  };

  const getTeamDisplay = (team: Team) => {
    if (team.name) return team.name;
    return team.players.map(p => p.firstName).join(' / ');
  };

  // Statistiques
  const pendingMatches = rounds.flatMap(r => r.matches).filter(m =>
    m.status !== 'FINISHED' && !m.isBye && m.homeTeam && m.awayTeam
  ).length;
  const finishedMatches = rounds.flatMap(r => r.matches).filter(m => m.status === 'FINISHED').length;
  const totalMatches = rounds.flatMap(r => r.matches).filter(m => !m.isBye || m.status === 'FINISHED').length;
  const progress = totalMatches > 0 ? Math.round((finishedMatches / totalMatches) * 100) : 0;

  // Déterminer le vainqueur
  const finalMatch = rounds.length > 0 ? rounds[rounds.length - 1].matches[0] : null;
  const winner = finalMatch?.status === 'FINISHED'
    ? (finalMatch.winnerTeamId === finalMatch.homeTeam?.id ? finalMatch.homeTeam : finalMatch.awayTeam)
    : null;

  return (
    <>
      <div className="card-petanque overflow-hidden">
        {/* Header */}
        <div className={`p-5 ${type === 'A' ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F]' : 'bg-gradient-to-r from-[#718096] to-[#A0AEC0]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/30 p-2 rounded-xl">
                {type === 'A' ? (
                  <TrophyPetanqueIcon className="w-8 h-8" />
                ) : (
                  <Trophy className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white drop-shadow">
                  Concours {type}
                </h3>
                <p className="text-white/80 text-sm">
                  {type === 'A' ? 'Tableau principal' : 'Tableau consolante'}
                </p>
              </div>
            </div>
            {winner && (
              <div className="bg-white/30 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                <Crown className="w-5 h-5 text-white" />
                <span className="font-bold text-white">Équipe {winner.teamNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Saisie rapide */}
        {canEdit && pendingMatches > 0 && (
          <div className="p-4 bg-gradient-to-r from-[#F5EFE0] to-[#FEF3C7] border-b border-[#E8DCC4]">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="1024"
                  value={quickInput}
                  onChange={(e) => handleQuickInputChange(e.target.value)}
                  placeholder="N° équipe gagnante..."
                  className="w-full pl-10 pr-4 py-3 input-petanque text-lg"
                />
              </div>
              <span className="text-sm text-gray-600">
                {pendingMatches} match{pendingMatches > 1 ? 's' : ''} en attente
              </span>
            </div>
            {error && !pendingWinner && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>
        )}

        {/* Bracket */}
        <div className="p-5">
          <div className="overflow-x-auto">
            <div className="flex gap-6 min-w-max pb-4">
              {rounds.map((round, roundIndex) => (
                <div key={round.roundNumber} className="flex-shrink-0" style={{ width: '240px' }}>
                  {/* Round header */}
                  <div className="text-center mb-4">
                    <span className={`inline-block px-4 py-2 rounded-xl text-sm font-semibold ${
                      roundIndex === rounds.length - 1
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] text-white'
                        : 'bg-[#F5EFE0] text-gray-700'
                    }`}>
                      {round.roundName}
                    </span>
                  </div>

                  {/* Matches */}
                  <div className="space-y-4">
                    {round.matches.map((match) => {
                      const isReady = match.homeTeam && match.awayTeam && match.status !== 'FINISHED' && !match.isBye;

                      return (
                      <div
                        key={match.id}
                        className={`bracket-match p-3 ${
                          match.isBye
                            ? 'bg-gray-100 border-gray-300'
                            : match.status === 'FINISHED'
                            ? 'bg-gradient-to-r from-[#f0fdf4] to-[#dcfce7] border-green-300'
                            : isReady
                            ? 'bg-blue-50 border-blue-400 border-[3px] shadow-md cursor-pointer hover:border-[#2D5A27] transition-all'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                        onClick={() => match.status !== 'FINISHED' && handleMatchClick(match)}
                      >
                        {match.isBye ? (
                          <div className="text-center py-2">
                            <div className="flex items-center justify-center gap-2 text-gray-500">
                              <div className="team-number text-xs w-6 h-6">
                                {match.homeTeam?.teamNumber || '?'}
                              </div>
                              <span className="text-sm">Exempt</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Badge "Prêt à jouer" si le match est prêt */}
                            {isReady && (
                              <div className="flex items-center justify-center mb-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide animate-pulse">
                                  Prêt
                                </span>
                              </div>
                            )}

                            {/* Équipe domicile */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {match.homeTeam ? (
                                  <>
                                    <div className={`team-number text-xs w-6 h-6 ${
                                      match.winnerTeamId === match.homeTeam.id
                                        ? 'bg-[#2D5A27]'
                                        : isReady
                                        ? 'bg-blue-600'
                                        : ''
                                    }`}>
                                      {match.homeTeam.teamNumber}
                                    </div>
                                    <span className={`text-sm ${
                                      match.winnerTeamId === match.homeTeam.id
                                        ? 'font-bold text-[#2D5A27]'
                                        : isReady
                                        ? 'font-bold text-blue-800'
                                        : 'text-gray-700'
                                    }`}>
                                      {getTeamDisplay(match.homeTeam)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">À déterminer</span>
                                )}
                              </div>
                              {match.winnerTeamId === match.homeTeam?.id && (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </div>

                            {/* Séparateur */}
                            <div className={`border-t border-dashed ${isReady ? 'border-blue-300' : 'border-gray-200'}`} />

                            {/* Équipe extérieur */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {match.awayTeam ? (
                                  <>
                                    <div className={`team-number text-xs w-6 h-6 ${
                                      match.winnerTeamId === match.awayTeam.id
                                        ? 'bg-[#2D5A27]'
                                        : isReady
                                        ? 'bg-blue-600'
                                        : ''
                                    }`}>
                                      {match.awayTeam.teamNumber}
                                    </div>
                                    <span className={`text-sm ${
                                      match.winnerTeamId === match.awayTeam.id
                                        ? 'font-bold text-[#2D5A27]'
                                        : isReady
                                        ? 'font-bold text-blue-800'
                                        : 'text-gray-700'
                                    }`}>
                                      {getTeamDisplay(match.awayTeam)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-sm text-gray-400 italic">À déterminer</span>
                                )}
                              </div>
                              {match.winnerTeamId === match.awayTeam?.id && (
                                <Check className="w-4 h-4 text-green-600" />
                              )}
                            </div>

                            {/* Indicateur cliquable */}
                            {canEdit && isReady && (
                              <div className="text-center pt-1">
                                <span className="text-xs text-blue-500 font-medium">Cliquer pour saisir le résultat</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="mt-6 p-4 bg-[#F5EFE0] rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-600">
                  <span className="font-semibold text-[#2D5A27]">{finishedMatches}</span> terminé{finishedMatches > 1 ? 's' : ''}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-600">
                  <span className="font-semibold text-amber-600">{pendingMatches}</span> en attente
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="font-semibold text-[#2D5A27]">{progress}%</span>
              </div>
            </div>
          </div>

          {/* Vainqueur */}
          {winner && (
            <div className={`mt-6 p-6 rounded-2xl text-center ${
              type === 'A'
                ? 'bg-gradient-to-r from-[#FEF3C7] via-[#FDE68A] to-[#FEF3C7] border-2 border-[#D4AF37]'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-300'
            }`}>
              <div className="flex items-center justify-center gap-2 mb-3">
                {type === 'A' ? (
                  <TrophyPetanqueIcon className="w-12 h-12" />
                ) : (
                  <Trophy className="w-12 h-12 text-gray-500" />
                )}
              </div>
              <p className={`font-bold text-lg ${type === 'A' ? 'text-[#92400E]' : 'text-gray-700'}`}>
                Vainqueur Concours {type}
              </p>
              <div className="flex items-center justify-center gap-3 mt-2">
                <div className={`team-number team-number-lg ${type === 'A' ? 'bg-[#D4AF37]' : 'bg-gray-500'}`}>
                  {winner.teamNumber}
                </div>
                <span className="text-xl font-semibold text-gray-800">
                  {getTeamDisplay(winner)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de sélection du gagnant (clic sur match) */}
      {selectedMatch && selectedMatch.homeTeam && selectedMatch.awayTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 modal-overlay"
            onClick={() => setSelectedMatch(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            {/* Header */}
            <div className={`p-4 text-white ${
              type === 'A'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4D03F]'
                : 'bg-gradient-to-r from-[#718096] to-[#A0AEC0]'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Qui a gagné ?</h3>
                  <p className="text-white/80 text-sm">Concours {type}</p>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {/* Équipe domicile */}
              <button
                onClick={() => handleSelectWinner(selectedMatch.homeTeam!, selectedMatch)}
                className="w-full p-4 border-2 border-[#E8DCC4] rounded-xl hover:border-[#2D5A27] hover:bg-[#f0fdf4] transition-all flex items-center gap-3"
              >
                <div className="team-number w-10 h-10 text-lg">{selectedMatch.homeTeam.teamNumber}</div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-800">{getTeamDisplay(selectedMatch.homeTeam)}</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Gagné
                </div>
              </button>

              {/* Équipe extérieur */}
              <button
                onClick={() => handleSelectWinner(selectedMatch.awayTeam!, selectedMatch)}
                className="w-full p-4 border-2 border-[#E8DCC4] rounded-xl hover:border-[#2D5A27] hover:bg-[#f0fdf4] transition-all flex items-center gap-3"
              >
                <div className="team-number w-10 h-10 text-lg">{selectedMatch.awayTeam.teamNumber}</div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-800">{getTeamDisplay(selectedMatch.awayTeam)}</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  Gagné
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation */}
      {pendingWinner && pendingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 modal-overlay"
            onClick={handleCancelConfirmation}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              <h3 className="text-lg font-bold text-gray-800 mb-2">Confirmer le gagnant</h3>

              <div className="p-4 bg-[#F5EFE0] rounded-xl mb-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="team-number team-number-lg">{pendingWinner.teamNumber}</div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{getTeamDisplay(pendingWinner)}</p>
                    <p className="text-sm text-gray-500">a gagné ce match ?</p>
                  </div>
                </div>
              </div>

              {/* Info sur le match */}
              {pendingMatch.homeTeam && pendingMatch.awayTeam && (
                <p className="text-sm text-gray-500 mb-4">
                  Match : {pendingMatch.homeTeam.teamNumber} vs {pendingMatch.awayTeam.teamNumber}
                </p>
              )}

              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm mb-4">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancelConfirmation}
                  className="flex-1 py-3 px-4 border-2 border-[#E8DCC4] text-gray-600 rounded-xl font-medium hover:bg-[#F5EFE0] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmWinner}
                  disabled={isSubmitting}
                  className="flex-1 btn-petanque disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <BouleIcon className="w-5 h-5 animate-roll" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {isSubmitting ? 'Enregistrement...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
