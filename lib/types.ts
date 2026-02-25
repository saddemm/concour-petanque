// Types pour remplacer les enums Prisma (SQLite ne supporte pas les enums natifs)

export type ContestStatus = 
  | 'DRAFT'
  | 'READY'
  | 'IN_PROGRESS'
  | 'POOLS_DONE'
  | 'BRACKETS_GENERATED'
  | 'FINISHED';

export type TeamType = 
  | 'TETE_A_TETE'
  | 'DOUBLETTE'
  | 'TRIPLETTE';

export type TeamStatus = 
  | 'REGISTERED'
  | 'FORFEIT'
  | 'DISQUALIFIED';

export type MatchStatus = 
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'FORFEIT';

export type BracketType = 'A' | 'B';
