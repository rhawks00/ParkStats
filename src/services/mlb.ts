import type { MLBGameSearchResult, PlayerGameStats, PitcherGameStats, HitEvent } from '../types';

const MLB_API = 'https://statsapi.mlb.com/api/v1';

export async function searchGamesByDate(date: string): Promise<MLBGameSearchResult[]> {
  const res = await fetch(
    `${MLB_API}/schedule?date=${date}&sportId=1&hydrate=team,venue,linescore`
  );
  const data = await res.json();

  if (!data.dates?.length) return [];

  return data.dates[0].games.map((g: any) => ({
    gamePk: g.gamePk,
    gameDate: g.gameDate,
    away: {
      id: g.teams.away.team.id,
      name: g.teams.away.team.name,
      abbreviation: g.teams.away.team.abbreviation,
    },
    home: {
      id: g.teams.home.team.id,
      name: g.teams.home.team.name,
      abbreviation: g.teams.home.team.abbreviation,
    },
    venue: g.venue?.name || 'Unknown',
    status: g.status?.detailedState || 'Unknown',
    awayScore: g.teams.away.score ?? 0,
    homeScore: g.teams.home.score ?? 0,
  }));
}

export async function fetchGameStats(gamePk: number): Promise<{
  playerStats: Omit<PlayerGameStats, 'id' | 'user_id'>[];
  pitcherStats: Omit<PitcherGameStats, 'id' | 'user_id'>[];
}> {
  const [boxRes, pbpRes] = await Promise.all([
    fetch(`${MLB_API}/game/${gamePk}/boxscore`),
    fetch(`${MLB_API}/game/${gamePk}/playByPlay`),
  ]);
  const box = await boxRes.json();
  const pbp = await pbpRes.json();

  const hitEvents = extractHitEvents(pbp);
  const players: Omit<PlayerGameStats, 'id' | 'user_id'>[] = [];
  const pitchers: Omit<PitcherGameStats, 'id' | 'user_id'>[] = [];

  for (const side of ['away', 'home'] as const) {
    const teamData = box.teams[side];
    const teamName = teamData.team?.abbreviation || teamData.team?.name || 'UNK';
    const starterPitcherId = teamData.pitchers?.[0] ?? null;

    for (const [, player] of Object.entries(teamData.players) as [string, any][]) {
      const playerId = player.person.id;
      const playerName = player.person.fullName;

      const batting = player.stats?.batting;
      if (batting && (batting.atBats > 0 || batting.walks > 0)) {
        const playerHits = hitEvents.filter((e) => e.batterId === playerId);
        players.push({
          game_pk: gamePk,
          player_id: playerId,
          player_name: playerName,
          team: teamName,
          hits: batting.hits || 0,
          at_bats: batting.atBats || 0,
          home_runs: batting.homeRuns || 0,
          doubles: batting.doubles || 0,
          triples: batting.triples || 0,
          rbis: batting.rbi || 0,
          stolen_bases: batting.stolenBases || 0,
          strikeouts: batting.strikeOuts || 0,
          walks: batting.baseOnBalls || 0,
          hit_events: playerHits.map((e) => ({
            type: e.type,
            description: e.description,
            coord_x: e.coordX,
            coord_y: e.coordY,
          })),
        });
      }

      const pitching = player.stats?.pitching;
      if (pitching && pitching.inningsPitched) {
        const ip = parseFloat(pitching.inningsPitched) || 0;
        pitchers.push({
          game_pk: gamePk,
          player_id: playerId,
          player_name: playerName,
          team: teamName,
          innings_pitched: ip,
          hits_allowed: pitching.hits || 0,
          runs_allowed: pitching.runs || 0,
          earned_runs: pitching.earnedRuns || 0,
          walks_allowed: pitching.baseOnBalls || 0,
          strikeouts_pitched: pitching.strikeOuts || 0,
          home_runs_allowed: pitching.homeRuns || 0,
          pitches_thrown: pitching.pitchesThrown || pitching.numberOfPitches || 0,
          win: pitching.wins > 0 || false,
          loss: pitching.losses > 0 || false,
          save: pitching.saves > 0 || false,
          is_starter: playerId === starterPitcherId,
        });
      }
    }
  }

  return { playerStats: players, pitcherStats: pitchers };
}

interface RawHitEvent {
  batterId: number;
  type: HitEvent['type'];
  description: string;
  coordX: number;
  coordY: number;
}

function extractHitEvents(pbp: any): RawHitEvent[] {
  const events: RawHitEvent[] = [];

  for (const play of pbp.allPlays || []) {
    const result = play.result;
    const hitData = play.playEvents?.find((e: any) => e.hitData)?.hitData;
    if (!hitData?.coordinates?.coordX) continue;

    const batterId = play.matchup?.batter?.id;
    if (!batterId) continue;

    let type: HitEvent['type'] = 'out';
    const event = result?.event?.toLowerCase() || '';
    if (event.includes('home run')) type = 'home_run';
    else if (event.includes('triple')) type = 'triple';
    else if (event.includes('double')) type = 'double';
    else if (event.includes('single')) type = 'single';
    else if (event.includes('flyout') || event.includes('fly out') || event.includes('pop out')) type = 'flyout';
    else if (event.includes('groundout') || event.includes('ground out') || event.includes('grounded')) type = 'groundout';

    events.push({
      batterId,
      type,
      description: result?.description || '',
      coordX: hitData.coordinates.coordX,
      coordY: hitData.coordinates.coordY,
    });
  }

  return events;
}
