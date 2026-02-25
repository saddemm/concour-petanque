import { describe, it, expect } from 'vitest';
import {
  generateQualificationRound1,
  generateQualificationRound2,
  getRound1Results,
  qualifyTeamsAfterRound2,
  buildBracket
} from '@/lib/algorithms';

describe('generateQualificationRound1', () => {
  it('should create matches for all teams (even number)', () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const matches = generateQualificationRound1(teams);

    // 8 teams = 4 matches, no byes
    expect(matches).toHaveLength(4);
    expect(matches.every(m => !m.isBye)).toBe(true);
  });

  it('should create one bye for odd number of teams', () => {
    const teams = Array.from({ length: 7 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const matches = generateQualificationRound1(teams);

    // 7 teams = 3 matches + 1 bye
    expect(matches).toHaveLength(4);
    const byes = matches.filter(m => m.isBye);
    expect(byes).toHaveLength(1);
  });

  it('should throw error for less than 2 teams', () => {
    const teams = Array.from({ length: 1 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    expect(() => generateQualificationRound1(teams)).toThrow();
  });
});

describe('getRound1Results', () => {
  it('should correctly identify winners and losers', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const matches = [
      {
        homeTeamId: 'team-0',
        awayTeamId: 'team-1',
        winnerTeamId: 'team-0',
        loserTeamId: 'team-1',
        isBye: false
      },
      {
        homeTeamId: 'team-2',
        awayTeamId: 'team-3',
        winnerTeamId: 'team-2',
        loserTeamId: 'team-3',
        isBye: false
      },
    ];

    const results = getRound1Results(matches, teams);

    expect(results.winners).toHaveLength(2);
    expect(results.losers).toHaveLength(2);
    expect(results.winners.map(t => t.id)).toContain('team-0');
    expect(results.winners.map(t => t.id)).toContain('team-2');
    expect(results.losers.map(t => t.id)).toContain('team-1');
    expect(results.losers.map(t => t.id)).toContain('team-3');
  });

  it('should treat bye as a win', () => {
    const teams = Array.from({ length: 3 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const matches = [
      {
        homeTeamId: 'team-0',
        awayTeamId: 'team-1',
        winnerTeamId: 'team-0',
        loserTeamId: 'team-1',
        isBye: false
      },
      {
        homeTeamId: 'team-2',
        awayTeamId: null,
        winnerTeamId: null,
        loserTeamId: null,
        isBye: true
      },
    ];

    const results = getRound1Results(matches, teams);

    expect(results.winners).toHaveLength(2);
    expect(results.losers).toHaveLength(1);
    expect(results.exemptedTeamId).toBe('team-2');
  });
});

describe('generateQualificationRound2', () => {
  it('should separate winners and losers', () => {
    const winners = Array.from({ length: 4 }, (_, i) => ({
      id: `winner-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const losers = Array.from({ length: 4 }, (_, i) => ({
      id: `loser-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 5,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const matches = generateQualificationRound2({ winners, losers });

    // 4 winner matches + 4 loser matches = 4 total (2+2)
    expect(matches).toHaveLength(4);

    const winnerMatches = matches.filter(m => m.groupType === 'WINNERS');
    const loserMatches = matches.filter(m => m.groupType === 'LOSERS');

    expect(winnerMatches).toHaveLength(2);
    expect(loserMatches).toHaveLength(2);
  });
});

describe('buildBracket', () => {
  it('should create proper bracket structure for 4 teams', () => {
    const teams = Array.from({ length: 4 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const bracket = buildBracket(teams);

    expect(bracket.rounds).toHaveLength(2); // Demi + Finale
    expect(bracket.rounds[0].matches).toHaveLength(2); // 2 demi-finales
    expect(bracket.rounds[1].matches).toHaveLength(1); // 1 finale
  });

  it('should have byes only in first round for non-power-of-2 teams', () => {
    const teams = Array.from({ length: 5 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const bracket = buildBracket(teams);

    // Pour 5 équipes, on a besoin de 8 places (prochaine puissance de 2)
    // Donc 3 byes au premier tour seulement
    const firstRoundByes = bracket.rounds[0].matches.filter(m => m.isBye);
    expect(firstRoundByes.length).toBe(3);

    // Pas de byes dans les autres tours
    for (let i = 1; i < bracket.rounds.length; i++) {
      const roundByes = bracket.rounds[i].matches.filter(m => m.isBye);
      expect(roundByes.length).toBe(0);
    }
  });

  it('should create 3 rounds for 8 teams', () => {
    const teams = Array.from({ length: 8 }, (_, i) => ({
      id: `team-${i}`,
      contestId: 'contest-1',
      teamNumber: i + 1,
      status: 'REGISTERED' as const,
      createdAt: new Date(),
      name: null,
      club: null,
    }));

    const bracket = buildBracket(teams);

    // 8 teams = 3 rounds (quarts, demis, finale)
    expect(bracket.rounds).toHaveLength(3);
    expect(bracket.rounds[0].matches).toHaveLength(4); // 4 quarts
    expect(bracket.rounds[1].matches).toHaveLength(2); // 2 demis
    expect(bracket.rounds[2].matches).toHaveLength(1); // 1 finale
  });
});
