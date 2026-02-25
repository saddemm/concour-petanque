'use client';

import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { BouleIcon } from '@/components/icons/PetanqueIcons';

interface Player {
  name: string;
  order: number;
}

interface TeamFormProps {
  contestId: string;
  teamType: 'TETE_A_TETE' | 'DOUBLETTE' | 'TRIPLETTE';
  onTeamAdded: () => void;
  nextTeamNumber: number;
}

export function TeamForm({ contestId, teamType, onTeamAdded, nextTeamNumber }: TeamFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([{ name: '', order: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numPlayers = teamType === 'TETE_A_TETE' ? 1 : teamType === 'DOUBLETTE' ? 2 : 3;

  const handleAddPlayer = () => {
    if (players.length < numPlayers) {
      setPlayers([...players, { name: '', order: players.length + 1 }]);
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length > 1) {
      const newPlayers = players.filter((_, i) => i !== index);
      newPlayers.forEach((p, i) => { p.order = i + 1; });
      setPlayers(newPlayers);
    }
  };

  const handlePlayerChange = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index].name = value;
    setPlayers(newPlayers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (players.length !== numPlayers) {
      setError(`Une équipe ${teamType} doit avoir ${numPlayers} joueur(s)`);
      return;
    }

    const hasEmptyFields = players.some(p => !p.name.trim());
    if (hasEmptyFields) {
      setError('Tous les joueurs doivent avoir un nom');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/contests/${contestId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de l\'ajout de l\'équipe');
      }

      // Reset form
      setPlayers([{ name: '', order: 1 }]);
      setIsOpen(false);
      onTeamAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPlayers([{ name: '', order: 1 }]);
    setError('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-petanque flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white"
      >
        <Plus className="w-5 h-5" />
        Ajouter une équipe
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 modal-overlay"
            onClick={() => {
              setIsOpen(false);
              resetForm();
            }}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2D5A27] to-[#4A7C43] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Nouvelle équipe</h3>
                  <p className="text-white/80 text-sm">Ajoutez les joueurs</p>
                </div>
              </div>
            </div>

            {/* Numéro d'équipe */}
            <div className="p-5 border-b-2 border-[#E8DCC4] bg-gradient-to-r from-[#F5EFE0] to-white">
              <div className="flex items-center justify-center gap-4">
                <BouleIcon className="w-10 h-10 text-[#4A5568]" />
                <div className="text-center">
                  <p className="text-sm text-gray-500 uppercase tracking-wide">Équipe numéro</p>
                  <p className="text-4xl font-bold text-[#2D5A27]">{nextTeamNumber}</p>
                </div>
                <BouleIcon className="w-10 h-10 text-[#718096]" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs">!</div>
                  {error}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">
                    Joueurs ({players.length}/{numPlayers})
                  </label>
                  {players.length < numPlayers && (
                    <button
                      type="button"
                      onClick={handleAddPlayer}
                      className="text-sm text-[#2D5A27] hover:text-[#4A7C43] font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {players.map((player, index) => (
                    <div key={index} className="flex gap-2 items-center animate-fade-in">
                      <div className="w-8 h-8 bg-[#4A5568] text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <input
                        value={player.name}
                        onChange={(e) => handlePlayerChange(index, e.target.value)}
                        placeholder={`Nom du joueur ${index + 1}`}
                        required
                        className="flex-1 input-petanque"
                      />
                      {players.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePlayer(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="flex-1 py-3 px-4 border-2 border-[#E8DCC4] text-gray-600 rounded-xl font-medium hover:bg-[#F5EFE0] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-petanque disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <BouleIcon className="w-5 h-5 animate-roll" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Ajouter l'équipe
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
