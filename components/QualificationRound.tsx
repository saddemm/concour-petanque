'use client';

import { useState } from 'react';
import { Trophy, Check, X, Search, AlertCircle } from 'lucide-react';
import { BouleIcon, CochonnetIcon } from '@/components/icons/PetanqueIcons';

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
  loserTeamId?: string;
  status: string;
  isBye: boolean;
  groupType?: string;
}

interface PendingTeam {
  team: Team;
  type: 'winner' | 'loser';
}

interface QualificationRoundProps {
  roundNumber: number;
  matches: Match[];
  allTeams: Team[];
  onMatchUpdate: () => void;
  contestId: string;
  canEdit: boolean;
  pendingTeams?: PendingTeam[]; // Équipes en attente d'assignation (pour le Tour 2)
}

export function QualificationRound({
  roundNumber,
  matches,
  allTeams,
  onMatchUpdate,
  contestId,
  canEdit,
  pendingTeams = [],
}: QualificationRoundProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winnerInput, setWinnerInput] = useState('');
  const [pendingWinner, setPendingWinner] = useState<Team | null>(null);
  const [pendingMatch, setPendingMatch] = useState<Match | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getTeamDisplay = (team: Team) => {
    if (team.name) return team.name;
    return team.players.map((p) => p.firstName).join(' / ');
  };

  // Trouver le match correspondant à une équipe par son numéro
  const findMatchByTeamNumber = (teamNumber: number): { match: Match; team: Team } | null => {
    for (const match of matches) {
      if (match.status === 'FINISHED' || match.isBye) continue;
      if (match.homeTeam?.teamNumber === teamNumber) {
        return { match, team: match.homeTeam };
      }
      if (match.awayTeam?.teamNumber === teamNumber) {
        return { match, team: match.awayTeam };
      }
    }
    return null;
  };

  // Soumettre le numéro d'équipe pour confirmation
  const handleWinnerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const teamNumber = parseInt(winnerInput, 10);
    if (isNaN(teamNumber) || teamNumber < 1 || teamNumber > 1024) {
      setError('Numéro d\'équipe invalide (1-1024)');
      return;
    }

    const result = findMatchByTeamNumber(teamNumber);
    if (!result) {
      setError(`Équipe ${teamNumber} non trouvée dans les matchs en cours`);
      return;
    }

    setPendingWinner(result.team);
    setPendingMatch(result.match);
  };

  // Confirmer le gagnant
  const handleConfirmWinner = async () => {
    if (!pendingWinner || !pendingMatch) return;

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/contests/${contestId}/qualification-matches/${pendingMatch.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winnerTeamId: pendingWinner.id }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      setWinnerInput('');
      setPendingWinner(null);
      setPendingMatch(null);
      onMatchUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Annuler la confirmation
  const handleCancelConfirm = () => {
    setPendingWinner(null);
    setPendingMatch(null);
    setWinnerInput('');
    setError('');
  };

  // Clic sur un match pour ouvrir la popup
  const handleMatchClick = (match: Match) => {
    if (!canEdit || match.status === 'FINISHED' || match.isBye) return;
    setSelectedMatch(match);
    setError('');
  };

  // Déclarer un gagnant depuis la popup
  const handleDeclareWinner = async (match: Match, winnerId: string) => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/contests/${contestId}/qualification-matches/${match.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winnerTeamId: winnerId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }

      setSelectedMatch(null);
      onMatchUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishedMatches = matches.filter((m) => m.status === 'FINISHED').length;
  const pendingMatches = matches.filter((m) => m.status !== 'FINISHED' && !m.isBye);
  const totalMatches = matches.length;
  const isComplete = finishedMatches === totalMatches && totalMatches > 0;

  // Séparer les matchs par groupe pour le Tour 2
  const winnersMatches = matches.filter((m) => m.groupType === 'WINNERS');
  const losersMatches = matches.filter((m) => m.groupType === 'LOSERS');
  const hasGroups = winnersMatches.length > 0 || losersMatches.length > 0;

  // Un match est prêt à jouer si les deux équipes sont assignées et le match n'est pas terminé
  const isMatchReady = (match: Match) =>
    match.homeTeam && match.awayTeam && match.status !== 'FINISHED' && !match.isBye;

  const renderMatch = (match: Match) => {
    const ready = isMatchReady(match);

    return (
    <div
      key={match.id}
      onClick={() => handleMatchClick(match)}
      className={`p-3 rounded-xl border-2 transition-all ${
        match.status === 'FINISHED'
          ? 'bg-green-50 border-green-200'
          : match.isBye
          ? 'bg-amber-50 border-amber-200'
          : ready
          ? 'bg-blue-50 border-blue-400 border-[3px] shadow-md hover:border-[#2D5A27] cursor-pointer'
          : 'bg-white border-gray-200 hover:border-[#2D5A27] hover:shadow-md cursor-pointer'
      }`}
    >
      {match.isBye ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="team-number text-sm w-8 h-8 bg-amber-500">
              {match.homeTeam?.teamNumber || '?'}
            </div>
            <span className="font-medium text-gray-700">
              {match.homeTeam ? getTeamDisplay(match.homeTeam) : 'Équipe inconnue'}
            </span>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            Exempt
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Badge "Prêt à jouer" si le match est prêt */}
          {ready && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide animate-pulse">
                Prêt à jouer
              </span>
            </div>
          )}

          {/* Équipe 1 */}
          <div className={`flex items-center justify-between p-2 rounded-lg ${
            match.winnerTeamId === match.homeTeam?.id ? 'bg-green-100' : ''
          }`}>
            <div className="flex items-center gap-2">
              <div className={`team-number text-sm w-8 h-8 ${
                match.winnerTeamId === match.homeTeam?.id ? 'bg-green-600' : ready ? 'bg-blue-600' : ''
              }`}>
                {match.homeTeam?.teamNumber || '?'}
              </div>
              <span className={
                match.winnerTeamId === match.homeTeam?.id
                  ? 'font-bold text-green-700'
                  : ready
                  ? 'font-bold text-blue-800'
                  : 'text-gray-700'
              }>
                {match.homeTeam ? getTeamDisplay(match.homeTeam) : 'À déterminer'}
              </span>
            </div>
            {match.winnerTeamId === match.homeTeam?.id && (
              <Trophy className="w-5 h-5 text-green-600" />
            )}
          </div>

          <div className={`text-center text-xs font-medium ${ready ? 'text-blue-500' : 'text-gray-400'}`}>VS</div>

          {/* Équipe 2 */}
          <div className={`flex items-center justify-between p-2 rounded-lg ${
            match.winnerTeamId === match.awayTeam?.id ? 'bg-green-100' : ''
          }`}>
            <div className="flex items-center gap-2">
              <div className={`team-number text-sm w-8 h-8 ${
                match.winnerTeamId === match.awayTeam?.id ? 'bg-green-600' : ready ? 'bg-blue-600' : ''
              }`}>
                {match.awayTeam?.teamNumber || '?'}
              </div>
              <span className={
                match.winnerTeamId === match.awayTeam?.id
                  ? 'font-bold text-green-700'
                  : ready
                  ? 'font-bold text-blue-800'
                  : 'text-gray-700'
              }>
                {match.awayTeam ? getTeamDisplay(match.awayTeam) : 'À déterminer'}
              </span>
            </div>
            {match.winnerTeamId === match.awayTeam?.id && (
              <Trophy className="w-5 h-5 text-green-600" />
            )}
          </div>
        </div>
      )}
    </div>
  );
  };

  const renderMatchGroup = (groupMatches: Match[], title: string, isWinners: boolean) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isWinners ? 'bg-green-500' : 'bg-orange-500'}`} />
        <h4 className="font-semibold text-gray-700">{title}</h4>
        <span className="text-sm text-gray-500">
          ({groupMatches.filter((m) => m.status === 'FINISHED').length}/{groupMatches.length})
        </span>
      </div>
      <div className="space-y-2">{groupMatches.map(renderMatch)}</div>
    </div>
  );

  return (
    <>
      <div className="card-petanque overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <CochonnetIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Tour {roundNumber}</h3>
                <p className="text-white/80 text-sm">
                  {finishedMatches}/{totalMatches} matchs terminés
                </p>
              </div>
            </div>
            {isComplete && (
              <div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Check className="w-4 h-4" />
                Terminé
              </div>
            )}
          </div>
        </div>

        {/* Saisie rapide du gagnant */}
        {canEdit && !isComplete && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
            <form onSubmit={handleWinnerSearch} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Annoncer un gagnant (numéro d'équipe)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="1024"
                    value={winnerInput}
                    onChange={(e) => setWinnerInput(e.target.value)}
                    placeholder="N° équipe gagnante"
                    className="w-full input-petanque pr-10 text-lg"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <button
                  type="submit"
                  className="btn-petanque px-6"
                  disabled={!winnerInput}
                >
                  Rechercher
                </button>
              </div>
              {error && !pendingWinner && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Confirmation du gagnant */}
        {pendingWinner && pendingMatch && (
          <div className="p-4 bg-yellow-50 border-b-2 border-yellow-200">
            <div className="text-center space-y-3">
              <p className="text-gray-700">Confirmer la victoire de :</p>
              <div className="inline-flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-sm border-2 border-yellow-300">
                <div className="team-number text-lg w-10 h-10 bg-[#2D5A27]">
                  {pendingWinner.teamNumber}
                </div>
                <span className="text-xl font-bold text-gray-800">
                  {getTeamDisplay(pendingWinner)}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                contre l'équipe {pendingMatch.homeTeam?.id === pendingWinner.id
                  ? pendingMatch.awayTeam?.teamNumber
                  : pendingMatch.homeTeam?.teamNumber}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleCancelConfirm}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmWinner}
                  disabled={isSubmitting}
                  className="btn-petanque px-6 py-2 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <BouleIcon className="w-5 h-5 animate-roll" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Équipes en attente d'assignation (pour le Tour 2) */}
        {pendingTeams.length > 0 && (
          <div className="p-4 border-b-2 border-gray-100">
            <div className="space-y-3">
              {/* Gagnants en attente */}
              {pendingTeams.filter(p => p.type === 'winner').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-700">
                      Gagnants en attente ({pendingTeams.filter(p => p.type === 'winner').length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingTeams.filter(p => p.type === 'winner').map(({ team }) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full"
                      >
                        <div className="team-number text-xs w-6 h-6 bg-green-600">
                          {team.teamNumber}
                        </div>
                        <span className="text-sm text-green-700 font-medium">
                          {team.name || team.players.map(p => p.firstName).join(' / ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Perdants en attente */}
              {pendingTeams.filter(p => p.type === 'loser').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-sm font-medium text-orange-700">
                      Perdants en attente ({pendingTeams.filter(p => p.type === 'loser').length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingTeams.filter(p => p.type === 'loser').map(({ team }) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full"
                      >
                        <div className="team-number text-xs w-6 h-6 bg-orange-500">
                          {team.teamNumber}
                        </div>
                        <span className="text-sm text-orange-700 font-medium">
                          {team.name || team.players.map(p => p.firstName).join(' / ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Liste des matchs */}
        <div className="p-5 space-y-6">
          {hasGroups ? (
            <>
              {winnersMatches.length > 0 &&
                renderMatchGroup(winnersMatches, 'Gagnants du Tour 1', true)}
              {losersMatches.length > 0 &&
                renderMatchGroup(losersMatches, 'Perdants du Tour 1', false)}
            </>
          ) : (
            <div className="space-y-2">{matches.map(renderMatch)}</div>
          )}
        </div>

        {/* Récapitulatif */}
        {canEdit && (
          <div className="p-4 bg-gray-50 border-t-2 border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400" />
                  <span className="text-gray-600">En attente: <strong>{pendingMatches.length}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">Terminés: <strong>{finishedMatches}</strong></span>
                </div>
              </div>
              <span className="text-gray-500">
                {Math.round((finishedMatches / totalMatches) * 100)}% complété
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal de sélection gagnant/perdant */}
      {selectedMatch && selectedMatch.homeTeam && selectedMatch.awayTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedMatch(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] p-4 text-white">
              <h3 className="text-lg font-bold">Annoncer le résultat</h3>
              <p className="text-white/80 text-sm">Tour {roundNumber}</p>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <p className="text-center text-gray-600 mb-4">
                Cliquez sur l'équipe gagnante
              </p>

              {/* Équipe 1 */}
              <button
                onClick={() => handleDeclareWinner(selectedMatch, selectedMatch.homeTeam!.id)}
                disabled={isSubmitting}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="team-number text-lg w-10 h-10 group-hover:bg-green-600">
                      {selectedMatch.homeTeam.teamNumber}
                    </div>
                    <span className="font-semibold text-gray-700 group-hover:text-green-700">
                      {getTeamDisplay(selectedMatch.homeTeam)}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Gagnant
                  </div>
                </div>
              </button>

              <div className="text-center text-gray-400 text-sm font-medium">VS</div>

              {/* Équipe 2 */}
              <button
                onClick={() => handleDeclareWinner(selectedMatch, selectedMatch.awayTeam!.id)}
                disabled={isSubmitting}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="team-number text-lg w-10 h-10 group-hover:bg-green-600">
                      {selectedMatch.awayTeam.teamNumber}
                    </div>
                    <span className="font-semibold text-gray-700 group-hover:text-green-700">
                      {getTeamDisplay(selectedMatch.awayTeam)}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Gagnant
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedMatch(null)}
                className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors mt-4"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
