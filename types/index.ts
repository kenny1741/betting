export type MatchStatus =
  | "SCHEDULED" | "LIVE" | "1H" | "HT" | "2H"
  | "ET" | "P" | "FT" | "AET" | "PEN"
  | "POSTPONED" | "CANCELLED";

export type PickType = "HOME" | "DRAW" | "AWAY" | "BTTS_YES" | "OVER25" | "OVER15";

export interface Team {
  id: number;
  name: string;
  logo: string;
  form?: string;
  position?: number;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
}

export interface Prediction {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  bttsYesPct: number;
  over25Pct: number;
  over15Pct: number;
  pick: PickType;
  confidence: number;
  reasoning: string[];
  isTopPick: boolean;
  // Odds API fields (optional — only present after odds sync)
  oddsHome?: number | null;      // raw decimal odd e.g. 1.85
  oddsDraw?: number | null;
  oddsAway?: number | null;
  oddsHomePct?: number | null;   // implied probability after vig removal
  oddsDrawPct?: number | null;
  oddsAwayPct?: number | null;
  marketAgreement?: number | null; // 0-100, how much engine agrees with market
}

export interface Player {
  id: number;
  name: string;
  number: number;
  pos: string;
}

export interface LineupTeam {
  formation: string;
  startXI: Player[];
  substitutes: Player[];
}

export interface GoalEvent {
  minute: number;
  scorer: string;
  assist?: string;
  team: "home" | "away";
  type: "normal" | "own" | "penalty";
}

export interface Match {
  id: number;
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  leagueCountry: string;
  season: number;
  homeTeam: Team;
  awayTeam: Team;
  kickoff: string;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  goals: GoalEvent[];
  prediction: Prediction;
  homeLineup?: LineupTeam;
  awayLineup?: LineupTeam;
  venue?: string;
  syncedAt: string;
}





/*export type MatchStatus =
  | "SCHEDULED" | "LIVE" | "1H" | "HT" | "2H"
  | "ET" | "P" | "FT" | "AET" | "PEN"
  | "POSTPONED" | "CANCELLED";

export type PickType = "HOME" | "DRAW" | "AWAY" | "BTTS_YES" | "OVER25" | "OVER15";

export interface Team {
  id: number;
  name: string;
  logo: string;
  form?: string;
  position?: number;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
}

export interface Prediction {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  bttsYesPct: number;
  over25Pct: number;
  over15Pct: number;
  pick: PickType;
  confidence: number;
  reasoning: string[];
  isTopPick: boolean;
}

export interface Player {
  id: number;
  name: string;
  number: number;
  pos: string;
}

export interface LineupTeam {
  formation: string;
  startXI: Player[];
  substitutes: Player[];
}

export interface GoalEvent {
  minute: number;
  scorer: string;
  assist?: string;
  team: "home" | "away";
  type: "normal" | "own" | "penalty";
}

export interface Match {
  id: number;
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  leagueCountry: string;
  season: number;
  homeTeam: Team;
  awayTeam: Team;
  kickoff: string;
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  goals: GoalEvent[];
  prediction: Prediction;
  homeLineup?: LineupTeam;
  awayLineup?: LineupTeam;
  venue?: string;
  syncedAt: string;
}
*/