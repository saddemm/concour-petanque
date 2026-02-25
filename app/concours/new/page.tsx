'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Users, Shuffle } from 'lucide-react';

// Génère le nom par défaut avec la date d'aujourd'hui
function getDefaultName() {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  return `Concours du ${day}/${month}/${year}`;
}

export default function NewContestPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: getDefaultName(),
    location: '',
    teamType: 'DOUBLETTE',
    gameMode: 'MONTE', // MONTE ou MELEE
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la création du concours');
      }

      const contest = await response.json();
      router.push(`/concours/${contest.id}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Créer un nouveau concours</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Informations du concours</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du concours *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Championnat de printemps 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lieu
                </label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Boulodrome municipal (optionnel)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mode de jeu *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'MONTE', label: 'Monté', desc: 'Équipes pré-formées', icon: Users },
                    { value: 'MELEE', label: 'Mêlée', desc: 'Équipes aléatoires', icon: Shuffle },
                  ].map((mode) => (
                    <label
                      key={mode.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.gameMode === mode.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="gameMode"
                        value={mode.value}
                        checked={formData.gameMode === mode.value}
                        onChange={(e) => {
                          const newMode = e.target.value;
                          // Si on passe en Mélée et que Tête-à-tête est sélectionné, basculer vers Doublette
                          const newTeamType = newMode === 'MELEE' && formData.teamType === 'TETE_A_TETE'
                            ? 'DOUBLETTE'
                            : formData.teamType;
                          setFormData({ ...formData, gameMode: newMode, teamType: newTeamType });
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <mode.icon className={`w-6 h-6 ${formData.gameMode === mode.value ? 'text-green-600' : 'text-gray-400'}`} />
                        <div>
                          <div className="font-semibold text-sm">{mode.label}</div>
                          <div className="text-xs text-gray-500">{mode.desc}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'équipe *
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'TETE_A_TETE', label: 'Tête-à-tête', desc: '1 joueur' },
                    { value: 'DOUBLETTE', label: 'Doublette', desc: '2 joueurs' },
                    { value: 'TRIPLETTE', label: 'Triplette', desc: '3 joueurs' },
                  ].map((type) => {
                    // Désactiver Tête-à-tête en mode Mélée
                    const isDisabled = type.value === 'TETE_A_TETE' && formData.gameMode === 'MELEE';

                    return (
                      <label
                        key={type.value}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          isDisabled
                            ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                            : formData.teamType === type.value
                              ? 'border-blue-600 bg-blue-50 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="teamType"
                          value={type.value}
                          checked={formData.teamType === type.value}
                          disabled={isDisabled}
                          onChange={(e) => setFormData({ ...formData, teamType: e.target.value })}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <div className={`font-semibold text-sm ${isDisabled ? 'text-gray-400' : ''}`}>{type.label}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {isDisabled ? 'Non disponible en mêlée' : type.desc}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/">
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Créer le concours'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
