import { Team } from '@prisma/client';

// ============================================================
// TYPES POUR LE SYSTÈME DE QUALIFICATION
// ============================================================

export interface QualificationMatchInfo {
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  isBye: boolean;
  groupType?: 'WINNERS' | 'LOSERS'; // Pour le Tour 2
}

export interface QualificationResult {
  teamId: string;
  round1Result: 'WIN' | 'LOSS' | 'BYE';
  round2Result?: 'WIN' | 'LOSS' | 'BYE';
}

// ============================================================
// UTILITAIRES
// ============================================================

/**
 * Mélange aléatoirement un tableau (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ============================================================
// TOUR 1 DE QUALIFICATION
// ============================================================

/**
 * Génère les matchs du Tour 1 de qualification
 * - Toutes les équipes jouent (tirage aléatoire)
 * - Si nombre impair: une équipe est exemptée (considérée gagnante)
 *
 * @param teams Liste de toutes les équipes
 * @returns Liste des matchs avec les exemptions
 */
export function generateQualificationRound1(teams: Team[]): QualificationMatchInfo[] {
  if (teams.length < 2) {
    throw new Error('Au moins 2 équipes sont nécessaires');
  }

  const shuffled = shuffleArray(teams);
  const matches: QualificationMatchInfo[] = [];
  let matchNumber = 1;

  // Si nombre impair, la dernière équipe est exemptée
  const isOdd = shuffled.length % 2 === 1;
  const teamsToMatch = isOdd ? shuffled.slice(0, -1) : shuffled;
  const exemptedTeam = isOdd ? shuffled[shuffled.length - 1] : null;

  // Créer les matchs
  for (let i = 0; i < teamsToMatch.length; i += 2) {
    matches.push({
      matchNumber: matchNumber++,
      homeTeamId: teamsToMatch[i].id,
      awayTeamId: teamsToMatch[i + 1].id,
      isBye: false,
    });
  }

  // Ajouter le match d'exemption si nécessaire
  if (exemptedTeam) {
    matches.push({
      matchNumber: matchNumber++,
      homeTeamId: exemptedTeam.id,
      isBye: true,
    });
  }

  return matches;
}

// ============================================================
// TOUR 2 DE QUALIFICATION
// ============================================================

interface Round1Results {
  winners: Team[];
  losers: Team[];
  exemptedTeamId?: string; // ID de l'équipe exemptée au Tour 1
}

/**
 * Récupère les résultats du Tour 1
 *
 * @param matches Matchs du Tour 1 avec leurs résultats
 * @param teams Toutes les équipes
 * @returns Gagnants, perdants et équipe exemptée
 */
export function getRound1Results(
  matches: Array<{
    homeTeamId: string | null;
    awayTeamId: string | null;
    winnerTeamId: string | null;
    loserTeamId: string | null;
    isBye: boolean;
  }>,
  teams: Team[]
): Round1Results {
  const winners: Team[] = [];
  const losers: Team[] = [];
  let exemptedTeamId: string | undefined;

  const teamMap = new Map(teams.map(t => [t.id, t]));

  matches.forEach(match => {
    if (match.isBye && match.homeTeamId) {
      // Équipe exemptée = gagnante
      const team = teamMap.get(match.homeTeamId);
      if (team) {
        winners.push(team);
        exemptedTeamId = match.homeTeamId;
      }
    } else if (match.winnerTeamId && match.loserTeamId) {
      const winner = teamMap.get(match.winnerTeamId);
      const loser = teamMap.get(match.loserTeamId);
      if (winner) winners.push(winner);
      if (loser) losers.push(loser);
    }
  });

  return { winners, losers, exemptedTeamId };
}

/**
 * Génère les matchs du Tour 2 de qualification
 * - Gagnants du Tour 1 jouent entre eux
 * - Perdants du Tour 1 jouent entre eux
 * - Règle anti-double exemption: une équipe exemptée au Tour 1 ne peut pas l'être au Tour 2
 *
 * @param round1Results Résultats du Tour 1
 * @returns Liste des matchs du Tour 2 (gagnants + perdants)
 */
export function generateQualificationRound2(round1Results: Round1Results): QualificationMatchInfo[] {
  const { winners, losers, exemptedTeamId } = round1Results;
  const matches: QualificationMatchInfo[] = [];
  let matchNumber = 1;

  // Générer les matchs pour les gagnants
  const winnerMatches = generateGroupMatches(
    winners,
    'WINNERS',
    matchNumber,
    exemptedTeamId
  );
  matches.push(...winnerMatches);
  matchNumber += winnerMatches.length;

  // Générer les matchs pour les perdants
  const loserMatches = generateGroupMatches(
    losers,
    'LOSERS',
    matchNumber,
    exemptedTeamId
  );
  matches.push(...loserMatches);

  return matches;
}

/**
 * Génère les matchs pour un groupe (gagnants ou perdants)
 * Gère l'exemption si nombre impair
 */
function generateGroupMatches(
  teams: Team[],
  groupType: 'WINNERS' | 'LOSERS',
  startMatchNumber: number,
  exemptedInRound1?: string
): QualificationMatchInfo[] {
  if (teams.length === 0) return [];
  if (teams.length === 1) {
    // Une seule équipe = exemptée automatiquement
    return [{
      matchNumber: startMatchNumber,
      homeTeamId: teams[0].id,
      isBye: true,
      groupType,
    }];
  }

  const shuffled = shuffleArray(teams);
  const matches: QualificationMatchInfo[] = [];
  let matchNumber = startMatchNumber;

  // Si nombre impair, on doit exempter une équipe
  const isOdd = shuffled.length % 2 === 1;

  if (isOdd) {
    // Trouver une équipe à exempter (pas celle exemptée au Tour 1)
    let exemptIndex = shuffled.length - 1; // Par défaut, la dernière

    if (exemptedInRound1) {
      // Chercher une équipe différente de celle exemptée au Tour 1
      const eligibleIndices = shuffled
        .map((team, idx) => ({ id: team.id, idx }))
        .filter(t => t.id !== exemptedInRound1)
        .map(t => t.idx);

      if (eligibleIndices.length > 0) {
        // Prendre aléatoirement parmi les équipes éligibles
        const randomIndex = Math.floor(Math.random() * eligibleIndices.length);
        exemptIndex = eligibleIndices[randomIndex];
      }
      // Si toutes les équipes sont la même (ne devrait pas arriver), on garde le comportement par défaut
    }

    // Extraire l'équipe exemptée
    const exemptedTeam = shuffled[exemptIndex];
    const teamsToMatch = shuffled.filter((_, idx) => idx !== exemptIndex);

    // Créer les matchs
    for (let i = 0; i < teamsToMatch.length; i += 2) {
      matches.push({
        matchNumber: matchNumber++,
        homeTeamId: teamsToMatch[i].id,
        awayTeamId: teamsToMatch[i + 1].id,
        isBye: false,
        groupType,
      });
    }

    // Ajouter le match d'exemption
    matches.push({
      matchNumber: matchNumber++,
      homeTeamId: exemptedTeam.id,
      isBye: true,
      groupType,
    });
  } else {
    // Nombre pair: pas d'exemption
    for (let i = 0; i < shuffled.length; i += 2) {
      matches.push({
        matchNumber: matchNumber++,
        homeTeamId: shuffled[i].id,
        awayTeamId: shuffled[i + 1].id,
        isBye: false,
        groupType,
      });
    }
  }

  return matches;
}

// ============================================================
// QUALIFICATION FINALE (APRÈS TOUR 2)
// ============================================================

interface Round2Results {
  round1Matches: Array<{
    homeTeamId: string | null;
    winnerTeamId: string | null;
    loserTeamId: string | null;
    isBye: boolean;
  }>;
  round2Matches: Array<{
    homeTeamId: string | null;
    winnerTeamId: string | null;
    loserTeamId: string | null;
    isBye: boolean;
    groupType: string | null;
  }>;
}

/**
 * Détermine les équipes qualifiées après les 2 tours
 * - 2 victoires (G-G) → Concours A
 * - 1 victoire + 1 défaite (G-P ou P-G) → Concours B
 * - 2 défaites (P-P) → Éliminé
 *
 * @param results Résultats des deux tours
 * @param teams Toutes les équipes
 * @returns Équipes qualifiées pour A, B et éliminées
 */
export function qualifyTeamsAfterRound2(
  results: Round2Results,
  teams: Team[]
): { qualifiedA: Team[]; qualifiedB: Team[]; eliminated: Team[] } {
  const teamMap = new Map(teams.map(t => [t.id, t]));

  // Construire l'historique de chaque équipe
  const teamHistory = new Map<string, { round1: 'WIN' | 'LOSS'; round2: 'WIN' | 'LOSS' }>();

  // Analyser Tour 1
  results.round1Matches.forEach(match => {
    if (match.isBye && match.homeTeamId) {
      teamHistory.set(match.homeTeamId, { round1: 'WIN', round2: 'WIN' }); // placeholder
    } else if (match.winnerTeamId && match.loserTeamId) {
      teamHistory.set(match.winnerTeamId, { round1: 'WIN', round2: 'WIN' }); // placeholder
      teamHistory.set(match.loserTeamId, { round1: 'LOSS', round2: 'WIN' }); // placeholder
    }
  });

  // Analyser Tour 2
  results.round2Matches.forEach(match => {
    if (match.isBye && match.homeTeamId) {
      const history = teamHistory.get(match.homeTeamId);
      if (history) {
        history.round2 = 'WIN';
      }
    } else if (match.winnerTeamId && match.loserTeamId) {
      const winnerHistory = teamHistory.get(match.winnerTeamId);
      const loserHistory = teamHistory.get(match.loserTeamId);
      if (winnerHistory) winnerHistory.round2 = 'WIN';
      if (loserHistory) loserHistory.round2 = 'LOSS';
    }
  });

  // Classer les équipes
  const qualifiedA: Team[] = [];
  const qualifiedB: Team[] = [];
  const eliminated: Team[] = [];

  teamHistory.forEach((history, teamId) => {
    const team = teamMap.get(teamId);
    if (!team) return;

    const wins = (history.round1 === 'WIN' ? 1 : 0) + (history.round2 === 'WIN' ? 1 : 0);

    if (wins === 2) {
      qualifiedA.push(team);
    } else if (wins === 1) {
      qualifiedB.push(team);
    } else {
      eliminated.push(team);
    }
  });

  return { qualifiedA, qualifiedB, eliminated };
}

// ============================================================
// BRACKETS (Phase finale)
// ============================================================

export interface BracketStructure {
  rounds: BracketRoundStructure[];
}

export interface BracketRoundStructure {
  roundNumber: number;
  roundName: string;
  matches: BracketMatchStructure[];
}

export interface BracketMatchStructure {
  matchNumber: number;
  homeTeamId?: string;
  awayTeamId?: string;
  isBye: boolean;
  nextMatchId?: string;
}

/**
 * Trouve la prochaine puissance de 2 supérieure ou égale à n
 */
function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Retourne le nom du round selon le numéro et le total
 */
function getRoundName(roundNumber: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundNumber + 1;

  if (fromEnd === 1) return 'Finale';
  if (fromEnd === 2) return 'Demi-finales';
  if (fromEnd === 3) return 'Quarts de finale';
  if (fromEnd === 4) return 'Huitièmes de finale';

  return `Tour ${roundNumber}`;
}

/**
 * Construit la structure d'un tableau à élimination directe
 *
 * ALGORITHME STANDARD:
 * - On crée un bracket de taille nextPower (prochaine puissance de 2 >= n)
 * - Les n équipes sont placées, les (nextPower - n) positions restantes sont des byes
 * - Au 1er tour, les matchs bye (une seule équipe) permettent à l'équipe de passer automatiquement
 *
 * @param teams Équipes qualifiées pour ce tableau
 * @returns Structure du bracket avec rounds et matchs
 */
export function buildBracket(teams: Team[]): BracketStructure {
  if (teams.length === 0) {
    return { rounds: [] };
  }

  if (teams.length === 1) {
    return {
      rounds: [
        {
          roundNumber: 1,
          roundName: 'Finale',
          matches: [
            {
              matchNumber: 1,
              homeTeamId: teams[0].id,
              isBye: true,
            },
          ],
        },
      ],
    };
  }

  // Mélanger les équipes
  const shuffledTeams = shuffleArray(teams);
  const n = teams.length;

  // Trouver la prochaine puissance de 2 supérieure ou égale
  const nextPower = nextPowerOfTwo(n);
  const numByes = nextPower - n;
  const totalRounds = Math.log2(nextPower);

  const rounds: BracketRoundStructure[] = [];

  // Créer tous les rounds
  let matchesInRound = nextPower / 2;
  let teamIndex = 0;
  let byeCount = 0;

  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const roundName = getRoundName(roundNum, totalRounds);
    const matches: BracketMatchStructure[] = [];

    for (let i = 0; i < matchesInRound; i++) {
      if (roundNum === 1) {
        // Premier tour: placer les équipes et les byes
        // Les byes sont à la fin (derniers matchs)
        const isByeMatch = i >= (matchesInRound - numByes);

        if (isByeMatch) {
          // Match bye: une seule équipe
          matches.push({
            matchNumber: i + 1,
            homeTeamId: shuffledTeams[teamIndex++]?.id,
            isBye: true,
          });
          byeCount++;
        } else {
          // Match normal: deux équipes
          matches.push({
            matchNumber: i + 1,
            homeTeamId: shuffledTeams[teamIndex++]?.id,
            awayTeamId: shuffledTeams[teamIndex++]?.id,
            isBye: false,
          });
        }
      } else {
        // Tours suivants: matchs vides
        matches.push({
          matchNumber: i + 1,
          isBye: false,
        });
      }
    }

    rounds.push({
      roundNumber: roundNum,
      roundName,
      matches,
    });

    matchesInRound /= 2;
  }

  return { rounds };
}
