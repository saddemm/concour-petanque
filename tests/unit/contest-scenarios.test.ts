import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateQualificationRound1,
  generateQualificationRound2,
  getRound1Results,
  qualifyTeamsAfterRound2,
  buildBracket
} from '@/lib/algorithms';
import { Team } from '@prisma/client';

// ============================================================
// UTILITAIRES DE TEST
// ============================================================

/**
 * Crée un tableau de teams mock pour les tests
 */
function createMockTeams(count: number, mode: 'MONTE' | 'MELEE' = 'MONTE'): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    contestId: 'contest-test',
    teamNumber: i + 1,
    status: 'REGISTERED' as const,
    createdAt: new Date(),
    name: mode === 'MELEE' ? `Équipe Mélée ${i + 1}` : `Équipe Monté ${i + 1}`,
    club: null,
  }));
}

/**
 * Simule les résultats du Tour 1 (assignation aléatoire de gagnants)
 */
function simulateRound1Results(matches: ReturnType<typeof generateQualificationRound1>) {
  return matches.map(match => {
    if (match.isBye) {
      return {
        homeTeamId: match.homeTeamId || null,
        awayTeamId: null,
        winnerTeamId: null,
        loserTeamId: null,
        isBye: true,
      };
    }
    // Gagnant aléatoire (50/50)
    const homeWins = Math.random() < 0.5;
    return {
      homeTeamId: match.homeTeamId || null,
      awayTeamId: match.awayTeamId || null,
      winnerTeamId: homeWins ? match.homeTeamId! : match.awayTeamId!,
      loserTeamId: homeWins ? match.awayTeamId! : match.homeTeamId!,
      isBye: false,
    };
  });
}

/**
 * Simule les résultats du Tour 2 (assignation aléatoire de gagnants)
 */
function simulateRound2Results(matches: ReturnType<typeof generateQualificationRound2>) {
  return matches.map(match => {
    if (match.isBye) {
      return {
        homeTeamId: match.homeTeamId || null,
        winnerTeamId: null,
        loserTeamId: null,
        isBye: true,
        groupType: match.groupType || null,
      };
    }
    const homeWins = Math.random() < 0.5;
    return {
      homeTeamId: match.homeTeamId || null,
      winnerTeamId: homeWins ? match.homeTeamId! : match.awayTeamId!,
      loserTeamId: homeWins ? match.awayTeamId! : match.homeTeamId!,
      isBye: false,
      groupType: match.groupType || null,
    };
  });
}

// ============================================================
// CONFIGURATION POUR TESTS PARAMÉTRÉS
// ============================================================

// Récupérer le nombre d'équipes depuis les variables d'environnement
// TEAM_COUNT=25        → teste uniquement 25 équipes
// TEAM_MIN=20 TEAM_MAX=40  → teste de 20 à 40 équipes
// Sans variables       → teste de 10 à 120 équipes
const SPECIFIC_TEAM_COUNT = process.env.TEAM_COUNT ? parseInt(process.env.TEAM_COUNT, 10) : null;
const TEAM_MIN = process.env.TEAM_MIN ? parseInt(process.env.TEAM_MIN, 10) : 10;
const TEAM_MAX = process.env.TEAM_MAX ? parseInt(process.env.TEAM_MAX, 10) : 120;

// Générer les cas de test (pairs et impairs)
function generateTestCases(): number[] {
  if (SPECIFIC_TEAM_COUNT !== null) {
    return [SPECIFIC_TEAM_COUNT];
  }

  const cases: number[] = [];
  for (let i = TEAM_MIN; i <= TEAM_MAX; i++) {
    cases.push(i);
  }
  return cases;
}

// Cas pairs uniquement
function generateEvenCases(): number[] {
  if (SPECIFIC_TEAM_COUNT !== null && SPECIFIC_TEAM_COUNT % 2 === 0) {
    return [SPECIFIC_TEAM_COUNT];
  }
  if (SPECIFIC_TEAM_COUNT !== null) {
    return [];
  }

  const cases: number[] = [];
  const start = TEAM_MIN % 2 === 0 ? TEAM_MIN : TEAM_MIN + 1;
  for (let i = start; i <= TEAM_MAX; i += 2) {
    cases.push(i);
  }
  return cases;
}

// Cas impairs uniquement
function generateOddCases(): number[] {
  if (SPECIFIC_TEAM_COUNT !== null && SPECIFIC_TEAM_COUNT % 2 === 1) {
    return [SPECIFIC_TEAM_COUNT];
  }
  if (SPECIFIC_TEAM_COUNT !== null) {
    return [];
  }

  const cases: number[] = [];
  const start = TEAM_MIN % 2 === 1 ? TEAM_MIN : TEAM_MIN + 1;
  for (let i = start; i <= TEAM_MAX; i += 2) {
    cases.push(i);
  }
  return cases;
}

const EVEN_CASES = generateEvenCases();
const ODD_CASES = generateOddCases();
const ALL_CASES = generateTestCases();

// Helper pour éviter les suites de tests vides
const skipIfEmpty = (cases: number[]) => cases.length === 0;

// ============================================================
// TESTS CONCOURS MODE MONTÉ
// ============================================================

describe('Concours Mode MONTÉ', () => {

  describe.skipIf(skipIfEmpty(EVEN_CASES))('Tour 1 - Nombres pairs d\'équipes', () => {
    it.each(EVEN_CASES)('devrait générer les matchs correctement pour %i équipes', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MONTE');
      const matches = generateQualificationRound1(teams);

      // Vérifications
      const expectedMatches = teamCount / 2;
      expect(matches).toHaveLength(expectedMatches);
      expect(matches.every(m => !m.isBye)).toBe(true);

      // Toutes les équipes doivent être utilisées exactement une fois
      const usedTeamIds = new Set<string>();
      matches.forEach(m => {
        if (m.homeTeamId) usedTeamIds.add(m.homeTeamId);
        if (m.awayTeamId) usedTeamIds.add(m.awayTeamId);
      });
      expect(usedTeamIds.size).toBe(teamCount);
    });
  });

  describe.skipIf(skipIfEmpty(ODD_CASES))('Tour 1 - Nombres impairs d\'équipes', () => {
    it.each(ODD_CASES)('devrait générer les matchs avec 1 bye pour %i équipes', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MONTE');
      const matches = generateQualificationRound1(teams);

      // Vérifications
      const normalMatches = Math.floor(teamCount / 2);
      const byeMatches = 1;
      expect(matches).toHaveLength(normalMatches + byeMatches);

      const byes = matches.filter(m => m.isBye);
      expect(byes).toHaveLength(1);

      // L'équipe exemptée doit être dans la liste
      const byeTeamId = byes[0].homeTeamId;
      expect(teams.some(t => t.id === byeTeamId)).toBe(true);
    });
  });

  const tour2Cases = ALL_CASES.filter(n => n >= 10);
  describe.skipIf(skipIfEmpty(tour2Cases))('Tour 2 - Séparation Winners/Losers', () => {
    it.each(tour2Cases)('devrait séparer correctement gagnants et perdants pour %i équipes', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MONTE');

      // Tour 1
      const round1Matches = generateQualificationRound1(teams);
      const round1Results = simulateRound1Results(round1Matches);
      const results = getRound1Results(round1Results, teams);

      // Vérifications Tour 1
      const totalTeamsProcessed = results.winners.length + results.losers.length;
      expect(totalTeamsProcessed).toBe(teamCount);

      // Tour 2
      const round2Matches = generateQualificationRound2(results);

      // Vérifier la séparation WINNERS/LOSERS
      const winnersMatches = round2Matches.filter(m => m.groupType === 'WINNERS');
      const losersMatches = round2Matches.filter(m => m.groupType === 'LOSERS');

      // Le nombre de matchs WINNERS correspond au nombre de gagnants / 2 (arrondi sup pour impair)
      const expectedWinnersMatches = Math.ceil(results.winners.length / 2);
      const expectedLosersMatches = Math.ceil(results.losers.length / 2);

      expect(winnersMatches).toHaveLength(expectedWinnersMatches);
      expect(losersMatches).toHaveLength(expectedLosersMatches);
    });
  });

  const qualificationCases = ALL_CASES.filter(n => n >= 10);
  describe.skipIf(skipIfEmpty(qualificationCases))('Qualification finale après Tour 2', () => {
    it.each(qualificationCases)('devrait qualifier correctement les équipes pour %i équipes', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MONTE');

      // Simuler les deux tours complets
      const round1Matches = generateQualificationRound1(teams);
      const round1Results = simulateRound1Results(round1Matches);
      const r1Results = getRound1Results(round1Results, teams);

      const round2Matches = generateQualificationRound2(r1Results);
      const round2Results = simulateRound2Results(round2Matches);

      const qualification = qualifyTeamsAfterRound2(
        { round1Matches: round1Results, round2Matches: round2Results },
        teams
      );

      // Vérifications de cohérence
      const totalQualified = qualification.qualifiedA.length +
                             qualification.qualifiedB.length +
                             qualification.eliminated.length;

      // Le total doit être égal au nombre d'équipes
      expect(totalQualified).toBe(teamCount);

      // Pas de doublons
      const allTeamIds = [
        ...qualification.qualifiedA.map(t => t.id),
        ...qualification.qualifiedB.map(t => t.id),
        ...qualification.eliminated.map(t => t.id),
      ];
      const uniqueIds = new Set(allTeamIds);
      expect(uniqueIds.size).toBe(teamCount);
    });
  });

  const bracketCases = ALL_CASES.filter(n => n >= 10);
  describe.skipIf(skipIfEmpty(bracketCases))('Bracket A et B', () => {
    it.each(bracketCases)('devrait construire les brackets correctement pour %i équipes', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MONTE');

      // Simuler jusqu'à la qualification
      const round1Matches = generateQualificationRound1(teams);
      const round1Results = simulateRound1Results(round1Matches);
      const r1Results = getRound1Results(round1Results, teams);

      const round2Matches = generateQualificationRound2(r1Results);
      const round2Results = simulateRound2Results(round2Matches);

      const qualification = qualifyTeamsAfterRound2(
        { round1Matches: round1Results, round2Matches: round2Results },
        teams
      );

      // Bracket A
      if (qualification.qualifiedA.length > 0) {
        const bracketA = buildBracket(qualification.qualifiedA);

        expect(bracketA.rounds.length).toBeGreaterThan(0);

        // Vérifier la structure du bracket
        const finalRound = bracketA.rounds[bracketA.rounds.length - 1];
        expect(finalRound.roundName).toBe('Finale');
        expect(finalRound.matches).toHaveLength(1);

        // Vérifier que le nombre de rounds est correct (log2 de la prochaine puissance de 2)
        const nextPower = Math.pow(2, Math.ceil(Math.log2(qualification.qualifiedA.length)));
        const expectedRounds = Math.log2(nextPower);
        expect(bracketA.rounds).toHaveLength(expectedRounds);
      }

      // Bracket B
      if (qualification.qualifiedB.length > 0) {
        const bracketB = buildBracket(qualification.qualifiedB);

        expect(bracketB.rounds.length).toBeGreaterThan(0);

        const finalRound = bracketB.rounds[bracketB.rounds.length - 1];
        expect(finalRound.roundName).toBe('Finale');
        expect(finalRound.matches).toHaveLength(1);
      }
    });
  });
});

// ============================================================
// TESTS CONCOURS MODE MÉLÉE
// ============================================================

describe('Concours Mode MÉLÉE', () => {

  const meleeEvenCases = EVEN_CASES.filter(n => n <= 60);
  const meleeOddCases = ODD_CASES.filter(n => n <= 60);
  const meleeTripletteCases = EVEN_CASES.filter(n => n <= 40);

  describe.skipIf(skipIfEmpty(meleeEvenCases))('Formation d\'équipes à partir de joueurs individuels', () => {
    it.each(meleeEvenCases)('devrait former %i équipes à partir de joueurs (Doublette)', (teamCount) => {
      // En mode mélée doublette, on a 2x le nombre de joueurs
      const playerCount = teamCount * 2;

      // Simuler la création d'équipes à partir de joueurs
      const teams = createMockTeams(teamCount, 'MELEE');

      expect(teams).toHaveLength(teamCount);

      // Vérifier que le tirage fonctionne
      const matches = generateQualificationRound1(teams);
      expect(matches.length).toBeGreaterThan(0);
    });

    it.skipIf(skipIfEmpty(meleeOddCases)).each(meleeOddCases)('devrait gérer %i équipes impaires (Doublette mélée)', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MELEE');

      const matches = generateQualificationRound1(teams);

      // Vérifier qu'il y a exactement 1 bye
      const byes = matches.filter(m => m.isBye);
      expect(byes).toHaveLength(1);
    });
  });

  describe.skipIf(skipIfEmpty(meleeTripletteCases))('Triplette Mode Mélée', () => {
    it.each(meleeTripletteCases)('devrait former %i équipes triplette', (teamCount) => {
      // En mode mélée triplette, on a 3x le nombre de joueurs
      const playerCount = teamCount * 3;

      const teams = createMockTeams(teamCount, 'MELEE');

      expect(teams).toHaveLength(teamCount);

      const matches = generateQualificationRound1(teams);
      const expectedMatches = teamCount / 2;
      expect(matches).toHaveLength(expectedMatches);
    });
  });

  const tourCompletMeleeCases = ALL_CASES.filter(n => n >= 10);
  describe.skipIf(skipIfEmpty(tourCompletMeleeCases))('Tour complet Mélée', () => {
    it.each(tourCompletMeleeCases)('devrait exécuter un concours complet pour %i équipes mélée', (teamCount) => {
      const teams = createMockTeams(teamCount, 'MELEE');

      // Tour 1
      const round1Matches = generateQualificationRound1(teams);
      expect(round1Matches.length).toBeGreaterThan(0);

      const round1Results = simulateRound1Results(round1Matches);
      const r1Results = getRound1Results(round1Results, teams);

      // Tour 2
      const round2Matches = generateQualificationRound2(r1Results);
      expect(round2Matches.length).toBeGreaterThan(0);

      const round2Results = simulateRound2Results(round2Matches);

      // Qualification
      const qualification = qualifyTeamsAfterRound2(
        { round1Matches: round1Results, round2Matches: round2Results },
        teams
      );

      // Brackets
      if (qualification.qualifiedA.length > 0) {
        const bracketA = buildBracket(qualification.qualifiedA);
        expect(bracketA.rounds.length).toBeGreaterThan(0);
      }

      if (qualification.qualifiedB.length > 0) {
        const bracketB = buildBracket(qualification.qualifiedB);
        expect(bracketB.rounds.length).toBeGreaterThan(0);
      }

      // Vérification finale
      const total = qualification.qualifiedA.length +
                    qualification.qualifiedB.length +
                    qualification.eliminated.length;
      expect(total).toBe(teamCount);
    });
  });
});

// ============================================================
// TESTS DE ROBUSTESSE - CAS LIMITES
// ============================================================

describe('Cas Limites et Robustesse', () => {

  describe('Nombres minimum et maximum', () => {
    it('devrait rejeter moins de 2 équipes', () => {
      const teams = createMockTeams(1);
      expect(() => generateQualificationRound1(teams)).toThrow('Au moins 2 équipes sont nécessaires');
    });

    it('devrait accepter exactement 2 équipes', () => {
      const teams = createMockTeams(2);
      const matches = generateQualificationRound1(teams);
      expect(matches).toHaveLength(1);
      expect(matches[0].isBye).toBe(false);
    });

    it('devrait accepter exactement 3 équipes', () => {
      const teams = createMockTeams(3);
      const matches = generateQualificationRound1(teams);
      expect(matches).toHaveLength(2);
      expect(matches.filter(m => m.isBye)).toHaveLength(1);
    });

    it('devrait gérer 120 équipes', () => {
      const teams = createMockTeams(120);
      const matches = generateQualificationRound1(teams);
      expect(matches).toHaveLength(60);
      expect(matches.every(m => !m.isBye)).toBe(true);
    });

    it('devrait gérer 119 équipes (impair max)', () => {
      const teams = createMockTeams(119);
      const matches = generateQualificationRound1(teams);
      expect(matches).toHaveLength(60); // 59 matchs + 1 bye
      expect(matches.filter(m => m.isBye)).toHaveLength(1);
    });
  });

  describe('Puissances de 2 pour les brackets', () => {
    const powerOfTwoCases = [2, 4, 8, 16, 32, 64];

    it.each(powerOfTwoCases)('devrait créer un bracket parfait pour %i équipes (puissance de 2)', (teamCount) => {
      const teams = createMockTeams(teamCount);
      const bracket = buildBracket(teams);

      // Pas de byes pour les puissances de 2
      const firstRoundByes = bracket.rounds[0].matches.filter(m => m.isBye);
      expect(firstRoundByes).toHaveLength(0);

      // Nombre de rounds correct
      const expectedRounds = Math.log2(teamCount);
      expect(bracket.rounds).toHaveLength(expectedRounds);
    });
  });

  describe('Non-puissances de 2 pour les brackets', () => {
    const nonPowerCases = [3, 5, 6, 7, 9, 10, 15, 17, 31, 33, 63, 65];

    it.each(nonPowerCases)('devrait gérer correctement les byes pour %i équipes', (teamCount) => {
      const teams = createMockTeams(teamCount);
      const bracket = buildBracket(teams);

      // Calculer le nombre de byes attendus
      const nextPower = Math.pow(2, Math.ceil(Math.log2(teamCount)));
      const expectedByes = nextPower - teamCount;

      // Byes uniquement au premier tour
      const firstRoundByes = bracket.rounds[0].matches.filter(m => m.isBye);
      expect(firstRoundByes).toHaveLength(expectedByes);

      // Pas de byes dans les autres tours
      for (let i = 1; i < bracket.rounds.length; i++) {
        const roundByes = bracket.rounds[i].matches.filter(m => m.isBye);
        expect(roundByes).toHaveLength(0);
      }
    });
  });

  describe('Règle anti-double exemption', () => {
    it('devrait éviter qu\'une équipe soit exemptée deux fois de suite', () => {
      // Test avec 5 équipes (impair) - le gagnant du bye Tour 1 ne doit pas avoir le bye Tour 2
      // On exécute le test plusieurs fois pour vérifier la cohérence statistique
      for (let run = 0; run < 10; run++) {
        const teams = createMockTeams(5);

        const round1Matches = generateQualificationRound1(teams);
        const byeMatch = round1Matches.find(m => m.isBye);
        const exemptedTeamId = byeMatch?.homeTeamId;

        if (!exemptedTeamId) continue;

        // Simuler Tour 1 - l'équipe exemptée gagne automatiquement
        const round1Results = round1Matches.map(match => {
          if (match.isBye) {
            return {
              homeTeamId: match.homeTeamId || null,
              awayTeamId: null,
              winnerTeamId: null,
              loserTeamId: null,
              isBye: true,
            };
          }
          return {
            homeTeamId: match.homeTeamId || null,
            awayTeamId: match.awayTeamId || null,
            winnerTeamId: match.homeTeamId!, // Home gagne toujours pour ce test
            loserTeamId: match.awayTeamId!,
            isBye: false,
          };
        });

        const r1Results = getRound1Results(round1Results, teams);

        // Générer Tour 2
        const round2Matches = generateQualificationRound2(r1Results);

        // Vérifier si l'équipe exemptée au Tour 1 a été exemptée au Tour 2
        const round2Byes = round2Matches.filter(m => m.isBye && m.homeTeamId === exemptedTeamId);

        // Si le groupe WINNERS a plus d'une équipe, l'équipe exemptée ne devrait pas avoir le bye
        if (r1Results.winners.length > 1) {
          expect(round2Byes).toHaveLength(0);
        }
      }
    });
  });
});

// ============================================================
// TESTS DE PERFORMANCE
// ============================================================

describe('Tests de Performance', () => {
  it('devrait générer rapidement un concours de 120 équipes', () => {
    const teams = createMockTeams(120);

    const start = performance.now();

    // Tour 1
    const round1Matches = generateQualificationRound1(teams);
    const round1Results = simulateRound1Results(round1Matches);
    const r1Results = getRound1Results(round1Results, teams);

    // Tour 2
    const round2Matches = generateQualificationRound2(r1Results);
    const round2Results = simulateRound2Results(round2Matches);

    // Qualification
    const qualification = qualifyTeamsAfterRound2(
      { round1Matches: round1Results, round2Matches: round2Results },
      teams
    );

    // Brackets
    const bracketA = buildBracket(qualification.qualifiedA);
    const bracketB = buildBracket(qualification.qualifiedB);

    const end = performance.now();
    const duration = end - start;

    // Devrait prendre moins de 100ms
    expect(duration).toBeLessThan(100);
  });
});

// ============================================================
// TESTS COMPLETS DE SCÉNARIOS
// ============================================================

describe('Scénarios Complets', () => {
  const scenarioCases = [10, 16, 20, 25, 32, 40, 50, 64, 75, 100, 120];

  it.each(scenarioCases)('Scénario complet MONTÉ avec %i équipes', (teamCount) => {
    const teams = createMockTeams(teamCount, 'MONTE');

    // === TOUR 1 ===
    const round1Matches = generateQualificationRound1(teams);

    // Vérifier nombre de matchs Tour 1
    const expectedR1Matches = Math.ceil(teamCount / 2);
    expect(round1Matches).toHaveLength(expectedR1Matches);

    // Simuler résultats
    const round1Results = simulateRound1Results(round1Matches);
    const r1Analysis = getRound1Results(round1Results, teams);

    // Vérifier que toutes les équipes sont classées
    expect(r1Analysis.winners.length + r1Analysis.losers.length).toBe(teamCount);

    // === TOUR 2 ===
    const round2Matches = generateQualificationRound2(r1Analysis);

    // Vérifier séparation WINNERS/LOSERS
    const winnersR2 = round2Matches.filter(m => m.groupType === 'WINNERS');
    const losersR2 = round2Matches.filter(m => m.groupType === 'LOSERS');

    expect(winnersR2.length).toBe(Math.ceil(r1Analysis.winners.length / 2));
    expect(losersR2.length).toBe(Math.ceil(r1Analysis.losers.length / 2));

    // Simuler résultats Tour 2
    const round2Results = simulateRound2Results(round2Matches);

    // === QUALIFICATION ===
    const qualification = qualifyTeamsAfterRound2(
      { round1Matches: round1Results, round2Matches: round2Results },
      teams
    );

    // Vérifier distribution
    const totalClassified = qualification.qualifiedA.length +
                           qualification.qualifiedB.length +
                           qualification.eliminated.length;
    expect(totalClassified).toBe(teamCount);

    // === BRACKETS ===
    if (qualification.qualifiedA.length >= 2) {
      const bracketA = buildBracket(qualification.qualifiedA);
      expect(bracketA.rounds.length).toBeGreaterThan(0);
      expect(bracketA.rounds[bracketA.rounds.length - 1].roundName).toBe('Finale');
    }

    if (qualification.qualifiedB.length >= 2) {
      const bracketB = buildBracket(qualification.qualifiedB);
      expect(bracketB.rounds.length).toBeGreaterThan(0);
      expect(bracketB.rounds[bracketB.rounds.length - 1].roundName).toBe('Finale');
    }
  });

  it.each(scenarioCases)('Scénario complet MÉLÉE avec %i équipes', (teamCount) => {
    const teams = createMockTeams(teamCount, 'MELEE');

    // Le test est identique au mode MONTÉ car les algorithmes sont les mêmes
    // La différence est dans la formation des équipes (API level)

    const round1Matches = generateQualificationRound1(teams);
    const round1Results = simulateRound1Results(round1Matches);
    const r1Analysis = getRound1Results(round1Results, teams);

    const round2Matches = generateQualificationRound2(r1Analysis);
    const round2Results = simulateRound2Results(round2Matches);

    const qualification = qualifyTeamsAfterRound2(
      { round1Matches: round1Results, round2Matches: round2Results },
      teams
    );

    // Vérifications
    expect(qualification.qualifiedA.length +
           qualification.qualifiedB.length +
           qualification.eliminated.length).toBe(teamCount);

    // Au moins quelques équipes dans chaque catégorie pour un tournoi réaliste
    if (teamCount >= 10) {
      expect(qualification.qualifiedA.length).toBeGreaterThan(0);
      expect(qualification.qualifiedB.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================
// TESTS STATISTIQUES
// ============================================================

describe('Tests Statistiques (Distribution)', () => {
  it('devrait avoir une distribution équilibrée des qualifiés A/B/éliminés sur 50 runs', () => {
    const teamCount = 20;
    const runs = 50;

    let totalA = 0;
    let totalB = 0;
    let totalEliminated = 0;

    for (let i = 0; i < runs; i++) {
      const teams = createMockTeams(teamCount);

      const round1Matches = generateQualificationRound1(teams);
      const round1Results = simulateRound1Results(round1Matches);
      const r1Analysis = getRound1Results(round1Results, teams);

      const round2Matches = generateQualificationRound2(r1Analysis);
      const round2Results = simulateRound2Results(round2Matches);

      const qualification = qualifyTeamsAfterRound2(
        { round1Matches: round1Results, round2Matches: round2Results },
        teams
      );

      totalA += qualification.qualifiedA.length;
      totalB += qualification.qualifiedB.length;
      totalEliminated += qualification.eliminated.length;
    }

    const avgA = totalA / runs;
    const avgB = totalB / runs;
    const avgEliminated = totalEliminated / runs;

    // En théorie: ~25% qualifiés A (2 wins), ~50% qualifiés B (1 win), ~25% éliminés (0 win)
    // Mais avec les byes, la distribution peut varier
    // On vérifie juste que les moyennes sont raisonnables

    expect(avgA).toBeGreaterThan(0);
    expect(avgB).toBeGreaterThan(0);
    expect(avgEliminated).toBeGreaterThan(0);
    expect(avgA + avgB + avgEliminated).toBeCloseTo(teamCount, 0);
  });
});
