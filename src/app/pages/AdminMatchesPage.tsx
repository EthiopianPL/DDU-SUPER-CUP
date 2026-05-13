// src/app/pages/AdminMatchesPage.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Plus, Edit, Trash2, Save, X, AlertCircle,
  CheckCircle, Loader2, Calendar, Play,
  Filter, Activity, Timer, Clock, AlertTriangle
} from 'lucide-react';

interface Team {
  id: number;
  name: string;
  short_name?: string;
  color?: string;
  stadium?: string;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goals_for?: number;
  goals_against?: number;
  points?: number;
}

interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  team_id: number;
  goals: number;
  assists: number;
  appearances: number;
  minutes_played: number;
  yellow_cards: number;
  red_cards: number;
}

interface MatchEvent {
  id: number;
  match_id: number;
  type: string;
  minute: number;
  player_id: number;
  player_name: string;
  team_id: number;
  assisted_by?: number;
  is_penalty?: boolean;
  is_own_goal?: boolean;
}

interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  matchweek: number;
  date: string;
  time: string;
  stadium?: string;
  match_minute?: number;
  match_second?: number;
  match_half?: string;
  injury_time_first_half?: number;
  injury_time_second_half?: number;
  homeTeam?: Team;
  awayTeam?: Team;
  events?: MatchEvent[];
}

const initialFormData = {
  home_team_id: '',
  away_team_id: '',
  matchweek: '',
  date: '',
  time: '',
  stadium: '',
};

const initialEventData = {
  type: 'goal' as const,
  player_id: '',
  team_id: '',
  assisted_by: '',
  is_penalty: false,
  is_own_goal: false,
};

export function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState(initialFormData);
  const [eventData, setEventData] = useState(initialEventData);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentSecond, setCurrentSecond] = useState(0);
  const [currentHalf, setCurrentHalf] = useState<'first' | 'second'>('first');
  const [injuryTimeFirstHalf, setInjuryTimeFirstHalf] = useState(0);
  const [injuryTimeSecondHalf, setInjuryTimeSecondHalf] = useState(0);
  const [injuryTimeInput, setInjuryTimeInput] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isHalfTime, setIsHalfTime] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    homeTeamConflict?: string;
    awayTeamConflict?: string;
    duplicateFixture?: string;
  }>({});

  // Fetch initial data
  useEffect(() => {
    fetchTeams();
    fetchPlayers();
    fetchMatches();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-fill stadium when home team changes
  useEffect(() => {
    if (formData.home_team_id && !isEditing) {
      const selectedTeam = teams.find(t => t.id === Number(formData.home_team_id));
      if (selectedTeam?.stadium) {
        setFormData(prev => ({ ...prev, stadium: selectedTeam.stadium || '' }));
      }
    }
  }, [formData.home_team_id, teams, isEditing]);

  // Validate fixture when form data changes
  useEffect(() => {
    if (formData.matchweek && formData.home_team_id && formData.away_team_id) {
      validateFixture();
    } else {
      setValidationErrors({});
    }
  }, [formData.matchweek, formData.home_team_id, formData.away_team_id]);

  const validateFixture = async () => {
    const matchweek = parseInt(formData.matchweek);
    const homeTeamId = Number(formData.home_team_id);
    const awayTeamId = Number(formData.away_team_id);
    const errors: typeof validationErrors = {};

    // Check if teams already have matches in this matchweek
    const { data: weekMatches } = await supabase
      .from('matches')
      .select('home_team_id, away_team_id, id')
      .eq('matchweek', matchweek)
      .neq('id', editingId || 0);

    if (weekMatches) {
      const homeTeamInWeek = weekMatches.some(m => m.home_team_id === homeTeamId || m.away_team_id === homeTeamId);
      const awayTeamInWeek = weekMatches.some(m => m.home_team_id === awayTeamId || m.away_team_id === awayTeamId);

      if (homeTeamInWeek) {
        errors.homeTeamConflict = `This team already has a match scheduled in matchweek ${matchweek}`;
      }
      if (awayTeamInWeek) {
        errors.awayTeamConflict = `This team already has a match scheduled in matchweek ${matchweek}`;
      }
    }

    // Check if this fixture already exists (home vs away or away vs home)
    const { data: existingFixture } = await supabase
      .from('matches')
      .select('id')
      .eq('matchweek', matchweek)
      .or(`and(home_team_id.eq.${homeTeamId},away_team_id.eq.${awayTeamId}),and(home_team_id.eq.${awayTeamId},away_team_id.eq.${homeTeamId})`)
      .neq('id', editingId || 0)
      .maybeSingle();

    if (existingFixture) {
      errors.duplicateFixture = 'These teams already have a fixture scheduled in this matchweek';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Timer that updates every second
  useEffect(() => {
    if (!selectedMatch || selectedMatch.status !== 'live' || currentMinute >= 90 || isHalfTime) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);

    const intervalId = setInterval(async () => {
      let newSecond = currentSecond + 1;
      let newMinute = currentMinute;
      let newHalf = currentHalf;

      if (newSecond >= 60) {
        newSecond = 0;
        newMinute = currentMinute + 1;

        if (newMinute === 45) {
          setIsHalfTime(true);
        } else if (newMinute === 46) {
          setIsHalfTime(false);
          newHalf = 'second';
        }

        setCurrentMinute(newMinute);
        if (newMinute === 46) setCurrentHalf('second');

        if (newMinute >= 90) {
          clearInterval(intervalId);
          timerRef.current = null;
          await supabase
            .from('matches')
            .update({ status: 'finished', match_minute: 90, match_second: 0 })
            .eq('id', selectedMatch.id);
          await updateTeamStats(selectedMatch.id);
          setSuccess('Match finished! Team stats updated!');
          fetchMatches();
          return;
        }
      }

      setCurrentSecond(newSecond);
      await supabase
        .from('matches')
        .update({
          match_minute: newMinute,
          match_second: newSecond,
          match_half: newHalf,
          last_updated: new Date().toISOString()
        })
        .eq('id', selectedMatch.id);
    }, 1000);

    timerRef.current = intervalId;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [selectedMatch, currentMinute, currentSecond, currentHalf, isHalfTime]);

  // Background timer that updates ALL live matches every minute
  useEffect(() => {
    const updateAllLiveMatches = async () => {
      const { data: liveMatches } = await supabase
        .from('matches')
        .select('id, match_minute, match_half')
        .eq('status', 'live')
        .lt('match_minute', 90);

      if (!liveMatches || liveMatches.length === 0) return;

      for (const match of liveMatches) {
        let newMinute = match.match_minute + 1;
        let newHalf = match.match_half;

        if (newMinute === 45) {
          newHalf = 'half_time';
        } else if (newMinute === 46) {
          newHalf = 'second';
        }

        if (newMinute >= 90) {
          await supabase
            .from('matches')
            .update({ status: 'finished', match_minute: 90 })
            .eq('id', match.id);
          await updateTeamStats(match.id);
        } else {
          await supabase
            .from('matches')
            .update({ match_minute: newMinute, match_half: newHalf })
            .eq('id', match.id);
        }
      }
    };

    const interval = setInterval(updateAllLiveMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  // Update team statistics when match finishes
  const updateTeamStats = async (matchId: number) => {
    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      if (!match || match.status !== 'finished') return;

      const homeTeamId = match.home_team_id;
      const awayTeamId = match.away_team_id;
      const homeScore = match.home_score || 0;
      const awayScore = match.away_score || 0;

      const { data: homeTeam, error: homeError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', homeTeamId)
        .single();

      const { data: awayTeam, error: awayError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', awayTeamId)
        .single();

      if (homeError || awayError) throw new Error('Failed to fetch team stats');

      let homeResult = 'draw';
      let awayResult = 'draw';

      if (homeScore > awayScore) {
        homeResult = 'win';
        awayResult = 'loss';
      } else if (awayScore > homeScore) {
        homeResult = 'loss';
        awayResult = 'win';
      }

      // Update home team
      const homeNewPlayed = (homeTeam.played || 0) + 1;
      const homeNewWins = (homeTeam.wins || 0) + (homeResult === 'win' ? 1 : 0);
      const homeNewDraws = (homeTeam.draws || 0) + (homeResult === 'draw' ? 1 : 0);
      const homeNewLosses = (homeTeam.losses || 0) + (homeResult === 'loss' ? 1 : 0);
      const homeNewGoalsFor = (homeTeam.goals_for || 0) + homeScore;
      const homeNewGoalsAgainst = (homeTeam.goals_against || 0) + awayScore;
      const homeNewPoints = (homeNewWins * 3) + homeNewDraws;

      await supabase
        .from('teams')
        .update({
          played: homeNewPlayed,
          wins: homeNewWins,
          draws: homeNewDraws,
          losses: homeNewLosses,
          goals_for: homeNewGoalsFor,
          goals_against: homeNewGoalsAgainst,
          points: homeNewPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', homeTeamId);

      // Update away team
      const awayNewPlayed = (awayTeam.played || 0) + 1;
      const awayNewWins = (awayTeam.wins || 0) + (awayResult === 'win' ? 1 : 0);
      const awayNewDraws = (awayTeam.draws || 0) + (awayResult === 'draw' ? 1 : 0);
      const awayNewLosses = (awayTeam.losses || 0) + (awayResult === 'loss' ? 1 : 0);
      const awayNewGoalsFor = (awayTeam.goals_for || 0) + awayScore;
      const awayNewGoalsAgainst = (awayTeam.goals_against || 0) + homeScore;
      const awayNewPoints = (awayNewWins * 3) + awayNewDraws;

      await supabase
        .from('teams')
        .update({
          played: awayNewPlayed,
          wins: awayNewWins,
          draws: awayNewDraws,
          losses: awayNewLosses,
          goals_for: awayNewGoalsFor,
          goals_against: awayNewGoalsAgainst,
          points: awayNewPoints,
          updated_at: new Date().toISOString()
        })
        .eq('id', awayTeamId);

      console.log('Team stats updated successfully');
    } catch (error) {
      console.error('Error updating team stats:', error);
    }
  };

  // Revert team statistics when match is deleted
  const revertTeamStats = async (matchId: number) => {
    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      if (!match) return;

      const homeTeamId = match.home_team_id;
      const awayTeamId = match.away_team_id;
      const homeScore = match.home_score || 0;
      const awayScore = match.away_score || 0;

      const { data: homeTeam, error: homeError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', homeTeamId)
        .single();

      const { data: awayTeam, error: awayError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', awayTeamId)
        .single();

      if (homeError || awayError) throw new Error('Failed to fetch team stats');

      let homeResult = 'draw';
      let awayResult = 'draw';

      if (homeScore > awayScore) {
        homeResult = 'win';
        awayResult = 'loss';
      } else if (awayScore > homeScore) {
        homeResult = 'loss';
        awayResult = 'win';
      }

      // Revert home team
      const homeNewPlayed = Math.max(0, (homeTeam.played || 0) - 1);
      const homeNewWins = Math.max(0, (homeTeam.wins || 0) - (homeResult === 'win' ? 1 : 0));
      const homeNewDraws = Math.max(0, (homeTeam.draws || 0) - (homeResult === 'draw' ? 1 : 0));
      const homeNewLosses = Math.max(0, (homeTeam.losses || 0) - (homeResult === 'loss' ? 1 : 0));
      const homeNewGoalsFor = Math.max(0, (homeTeam.goals_for || 0) - homeScore);
      const homeNewGoalsAgainst = Math.max(0, (homeTeam.goals_against || 0) - awayScore);
      const homeNewPoints = (homeNewWins * 3) + homeNewDraws;

      await supabase
        .from('teams')
        .update({
          played: homeNewPlayed,
          wins: homeNewWins,
          draws: homeNewDraws,
          losses: homeNewLosses,
          goals_for: homeNewGoalsFor,
          goals_against: homeNewGoalsAgainst,
          points: homeNewPoints
        })
        .eq('id', homeTeamId);

      // Revert away team
      const awayNewPlayed = Math.max(0, (awayTeam.played || 0) - 1);
      const awayNewWins = Math.max(0, (awayTeam.wins || 0) - (awayResult === 'win' ? 1 : 0));
      const awayNewDraws = Math.max(0, (awayTeam.draws || 0) - (awayResult === 'draw' ? 1 : 0));
      const awayNewLosses = Math.max(0, (awayTeam.losses || 0) - (awayResult === 'loss' ? 1 : 0));
      const awayNewGoalsFor = Math.max(0, (awayTeam.goals_for || 0) - awayScore);
      const awayNewGoalsAgainst = Math.max(0, (awayTeam.goals_against || 0) - homeScore);
      const awayNewPoints = (awayNewWins * 3) + awayNewDraws;

      await supabase
        .from('teams')
        .update({
          played: awayNewPlayed,
          wins: awayNewWins,
          draws: awayNewDraws,
          losses: awayNewLosses,
          goals_for: awayNewGoalsFor,
          goals_against: awayNewGoalsAgainst,
          points: awayNewPoints
        })
        .eq('id', awayTeamId);

      console.log('Team stats reverted successfully');
    } catch (error) {
      console.error('Error reverting team stats:', error);
    }
  };

  // Revert player stats when match is deleted
  const revertPlayerStatsForMatch = async (matchId: number) => {
    const { data: events, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId);

    if (error || !events) return;

    const playerEventsMap = new Map<number, { events: MatchEvent[] }>();

    for (const event of events) {
      if (!playerEventsMap.has(event.player_id)) {
        playerEventsMap.set(event.player_id, { events: [] });
      }
      playerEventsMap.get(event.player_id)!.events.push(event);
    }

    for (const [playerId, { events: playerEvents }] of playerEventsMap) {
      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (!player) continue;

      let goalsToRevert = 0;
      let assistsToRevert = 0;
      let yellowCardsToRevert = 0;
      let redCardsToRevert = 0;

      for (const event of playerEvents) {
        if (event.type === 'goal') goalsToRevert++;
        else if (event.type === 'assist') assistsToRevert++;
        else if (event.type === 'yellow_card') yellowCardsToRevert++;
        else if (event.type === 'red_card') redCardsToRevert++;
      }

      await supabase
        .from('players')
        .update({
          goals: Math.max(0, (player.goals || 0) - goalsToRevert),
          assists: Math.max(0, (player.assists || 0) - assistsToRevert),
          yellow_cards: Math.max(0, (player.yellow_cards || 0) - yellowCardsToRevert),
          red_cards: Math.max(0, (player.red_cards || 0) - redCardsToRevert),
          appearances: Math.max(0, (player.appearances || 0) - 1),
          minutes_played: Math.max(0, (player.minutes_played || 0) - 90)
        })
        .eq('id', playerId);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase.from('players').select('*').order('name');
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          homeTeam:home_team_id(id, name, short_name, color, stadium),
          awayTeam:away_team_id(id, name, short_name, color, stadium)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .order('minute', { ascending: true });

      if (!eventsError && eventsData) {
        const matchesWithEvents = (data || []).map((match: any) => ({
          ...match,
          events: eventsData.filter((event: any) => event.match_id === match.id)
        }));
        setMatches(matchesWithEvents);
      } else {
        setMatches(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchEvents = async (matchId: number) => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', matchId)
        .order('minute', { ascending: true });
      if (error) throw error;
      setMatchEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const startMatch = async (matchId: number) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: 'live',
          match_minute: 0,
          match_second: 0,
          match_half: 'first',
          injury_time_first_half: 0,
          injury_time_second_half: 0,
          last_updated: new Date().toISOString()
        })
        .eq('id', matchId);

      if (error) throw error;
      setSuccess('Match started! Timer is running.');
      fetchMatches();

      const startedMatch = matches.find(m => m.id === matchId);
      if (startedMatch) {
        setCurrentMinute(0);
        setCurrentSecond(0);
        setCurrentHalf('first');
        setInjuryTimeFirstHalf(0);
        setInjuryTimeSecondHalf(0);
        setIsHalfTime(false);
        handleManageEvents(startedMatch);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to start match');
    }
  };

  const addInjuryTime = async (half: 'first' | 'second') => {
    if (!selectedMatch) return;

    const minutes = parseInt(injuryTimeInput);
    if (isNaN(minutes) || minutes <= 0) {
      setError('Enter valid minutes (1-10)');
      return;
    }

    try {
      if (half === 'first') {
        const newTime = injuryTimeFirstHalf + minutes;
        await supabase
          .from('matches')
          .update({ injury_time_first_half: newTime })
          .eq('id', selectedMatch.id);
        setInjuryTimeFirstHalf(newTime);
        setSuccess(`+${minutes} min added to first half!`);
      } else {
        const newTime = injuryTimeSecondHalf + minutes;
        await supabase
          .from('matches')
          .update({ injury_time_second_half: newTime })
          .eq('id', selectedMatch.id);
        setInjuryTimeSecondHalf(newTime);
        setSuccess(`+${minutes} min added to second half!`);
      }
      setInjuryTimeInput('');
      fetchMatches();
    } catch (error: any) {
      setError(error.message || 'Failed to add injury time');
    }
  };

  const finishMatch = async () => {
    if (!selectedMatch) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    await supabase
      .from('matches')
      .update({ status: 'finished', match_minute: 90, match_second: 0 })
      .eq('id', selectedMatch.id);

    await updateTeamStats(selectedMatch.id);

    setSuccess('Match finished! Team stats updated!');
    setShowEventForm(false);
    fetchMatches();
  };

  const getDisplayTime = () => {
    let minute = currentMinute;

    if (currentMinute === 45 && injuryTimeFirstHalf > 0) {
      return `45 +${injuryTimeFirstHalf}`;
    }
    if (currentMinute === 90 && injuryTimeSecondHalf > 0) {
      return `90 +${injuryTimeSecondHalf}`;
    }
    if (currentMinute === 45) return '45';
    if (currentMinute >= 90) return 'FT';

    return `${minute}:${currentSecond.toString().padStart(2, '0')}`;
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.player_id || !eventData.team_id) {
      setError('Player and team required');
      return;
    }

    try {
      const selectedPlayer = players.find(p => p.id === Number(eventData.player_id));
      let eventMinute = currentMinute;

      if (currentMinute === 45 && injuryTimeFirstHalf > 0) {
        eventMinute = 45 + injuryTimeFirstHalf;
      } else if (currentMinute === 90 && injuryTimeSecondHalf > 0) {
        eventMinute = 90 + injuryTimeSecondHalf;
      }

      const newEvent = {
        match_id: selectedMatch?.id,
        type: 'goal',
        minute: eventMinute,
        player_id: Number(eventData.player_id),
        player_name: selectedPlayer?.name || '',
        team_id: Number(eventData.team_id),
        assisted_by: eventData.assisted_by ? Number(eventData.assisted_by) : null,
        is_penalty: eventData.is_penalty,
        is_own_goal: eventData.is_own_goal,
      };

      const { error: eventError } = await supabase.from('match_events').insert([newEvent]);
      if (eventError) throw eventError;

      const scorerId = Number(eventData.player_id);
      const scorerStats = players.find(p => p.id === scorerId);
      await supabase
        .from('players')
        .update({ goals: (scorerStats?.goals || 0) + 1 })
        .eq('id', scorerId);

      if (eventData.assisted_by && eventData.assisted_by !== '') {
        const assisterId = Number(eventData.assisted_by);
        const assisterStats = players.find(p => p.id === assisterId);
        await supabase
          .from('players')
          .update({ assists: (assisterStats?.assists || 0) + 1 })
          .eq('id', assisterId);
      }

      const isHome = Number(eventData.team_id) === selectedMatch?.home_team_id;
      const currentScore = isHome ? selectedMatch?.home_score || 0 : selectedMatch?.away_score || 0;
      const updateData = isHome
        ? { home_score: currentScore + 1 }
        : { away_score: currentScore + 1 };

      await supabase.from('matches').update(updateData).eq('id', selectedMatch?.id);

      if (selectedMatch) {
        if (isHome) {
          setSelectedMatch({ ...selectedMatch, home_score: currentScore + 1 });
        } else {
          setSelectedMatch({ ...selectedMatch, away_score: currentScore + 1 });
        }
      }

      const existingScorerAppearance = matchEvents.some(e => e.player_id === scorerId);
      if (!existingScorerAppearance) {
        await supabase
          .from('players')
          .update({
            appearances: (scorerStats?.appearances || 0) + 1,
            minutes_played: (scorerStats?.minutes_played || 0) + 90
          })
          .eq('id', scorerId);
      }

      if (eventData.assisted_by && eventData.assisted_by !== '') {
        const assisterId = Number(eventData.assisted_by);
        if (assisterId !== scorerId) {
          const existingAssisterAppearance = matchEvents.some(e => e.player_id === assisterId);
          if (!existingAssisterAppearance) {
            const assisterStats = players.find(p => p.id === assisterId);
            await supabase
              .from('players')
              .update({
                appearances: (assisterStats?.appearances || 0) + 1,
                minutes_played: (assisterStats?.minutes_played || 0) + 90
              })
              .eq('id', assisterId);
          }
        }
      }

      const assistMessage = eventData.assisted_by ? ` (Assist: ${players.find(p => p.id === Number(eventData.assisted_by))?.name})` : '';
      setSuccess(`Goal! ${selectedPlayer?.name} scored at ${eventMinute}'!${assistMessage}`);

      setEventData(initialEventData);
      fetchMatchEvents(selectedMatch?.id || 0);
      fetchMatches();
      fetchPlayers();

    } catch (error: any) {
      setError(error.message || 'Failed to add event');
    }
  };

  const handleAddCardEvent = async (type: 'yellow_card' | 'red_card') => {
    if (!selectedMatch || !eventData.player_id || !eventData.team_id) {
      setError('Player and team required');
      return;
    }

    try {
      const selectedPlayer = players.find(p => p.id === Number(eventData.player_id));
      let eventMinute = currentMinute;

      if (currentMinute === 45 && injuryTimeFirstHalf > 0) {
        eventMinute = 45 + injuryTimeFirstHalf;
      } else if (currentMinute === 90 && injuryTimeSecondHalf > 0) {
        eventMinute = 90 + injuryTimeSecondHalf;
      }

      const newEvent = {
        match_id: selectedMatch?.id,
        type: type,
        minute: eventMinute,
        player_id: Number(eventData.player_id),
        player_name: selectedPlayer?.name || '',
        team_id: Number(eventData.team_id),
        assisted_by: null,
        is_penalty: false,
        is_own_goal: false,
      };

      const { error: eventError } = await supabase.from('match_events').insert([newEvent]);
      if (eventError) throw eventError;

      const playerId = Number(eventData.player_id);
      const playerStats = players.find(p => p.id === playerId);
      const updateField = type === 'yellow_card' ? 'yellow_cards' : 'red_cards';

      await supabase
        .from('players')
        .update({ [updateField]: (playerStats?.[updateField] || 0) + 1 })
        .eq('id', playerId);

      const existingAppearance = matchEvents.some(e => e.player_id === playerId);
      if (!existingAppearance) {
        await supabase
          .from('players')
          .update({
            appearances: (playerStats?.appearances || 0) + 1,
            minutes_played: (playerStats?.minutes_played || 0) + 90
          })
          .eq('id', playerId);
      }

      setSuccess(`${type === 'yellow_card' ? 'Yellow card' : 'Red card'} for ${selectedPlayer?.name} at ${eventMinute}'!`);

      setEventData(initialEventData);
      fetchMatchEvents(selectedMatch?.id || 0);
      fetchMatches();
      fetchPlayers();

    } catch (error: any) {
      setError(error.message || 'Failed to add card');
    }
  };

  const handleAddOffside = async () => {
    if (!selectedMatch || !eventData.player_id || !eventData.team_id) {
      setError('Player and team required');
      return;
    }

    try {
      const selectedPlayer = players.find(p => p.id === Number(eventData.player_id));
      let eventMinute = currentMinute;

      if (currentMinute === 45 && injuryTimeFirstHalf > 0) {
        eventMinute = 45 + injuryTimeFirstHalf;
      } else if (currentMinute === 90 && injuryTimeSecondHalf > 0) {
        eventMinute = 90 + injuryTimeSecondHalf;
      }

      const newEvent = {
        match_id: selectedMatch?.id,
        type: 'offside',
        minute: eventMinute,
        player_id: Number(eventData.player_id),
        player_name: selectedPlayer?.name || '',
        team_id: Number(eventData.team_id),
        assisted_by: null,
        is_penalty: false,
        is_own_goal: false,
      };

      const { error: eventError } = await supabase.from('match_events').insert([newEvent]);
      if (eventError) throw eventError;

      const existingAppearance = matchEvents.some(e => e.player_id === Number(eventData.player_id));
      if (!existingAppearance) {
        const playerStats = players.find(p => p.id === Number(eventData.player_id));
        await supabase
          .from('players')
          .update({
            appearances: (playerStats?.appearances || 0) + 1,
            minutes_played: (playerStats?.minutes_played || 0) + 90
          })
          .eq('id', Number(eventData.player_id));
      }

      setSuccess(`Offside! ${selectedPlayer?.name} at ${eventMinute}'!`);

      setEventData(initialEventData);
      fetchMatchEvents(selectedMatch?.id || 0);
      fetchMatches();
      fetchPlayers();

    } catch (error: any) {
      setError(error.message || 'Failed to add offside');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!confirm('Delete this event? Stats will be reverted.')) return;

    try {
      const { data: event, error: fetchError } = await supabase
        .from('match_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;

      const { data: player } = await supabase
        .from('players')
        .select('*')
        .eq('id', event.player_id)
        .single();

      if (player) {
        if (event.type === 'goal') {
          await supabase
            .from('players')
            .update({ goals: Math.max(0, (player.goals || 0) - 1) })
            .eq('id', event.player_id);

          if (event.assisted_by) {
            const { data: assister } = await supabase
              .from('players')
              .select('*')
              .eq('id', event.assisted_by)
              .single();

            if (assister) {
              await supabase
                .from('players')
                .update({ assists: Math.max(0, (assister.assists || 0) - 1) })
                .eq('id', event.assisted_by);
            }
          }

          const { data: match } = await supabase
            .from('matches')
            .select('*')
            .eq('id', event.match_id)
            .single();

          if (match) {
            const isHome = event.team_id === match.home_team_id;
            if (isHome) {
              await supabase
                .from('matches')
                .update({ home_score: Math.max(0, (match.home_score || 0) - 1) })
                .eq('id', event.match_id);
            } else {
              await supabase
                .from('matches')
                .update({ away_score: Math.max(0, (match.away_score || 0) - 1) })
                .eq('id', event.match_id);
            }
          }

        } else if (event.type === 'yellow_card') {
          await supabase
            .from('players')
            .update({ yellow_cards: Math.max(0, (player.yellow_cards || 0) - 1) })
            .eq('id', event.player_id);
        } else if (event.type === 'red_card') {
          await supabase
            .from('players')
            .update({ red_cards: Math.max(0, (player.red_cards || 0) - 1) })
            .eq('id', event.player_id);
        }

        const { data: otherEvents } = await supabase
          .from('match_events')
          .select('id')
          .eq('match_id', event.match_id)
          .eq('player_id', event.player_id)
          .neq('id', eventId);

        if (!otherEvents || otherEvents.length === 0) {
          await supabase
            .from('players')
            .update({
              appearances: Math.max(0, (player.appearances || 0) - 1),
              minutes_played: Math.max(0, (player.minutes_played || 0) - 90)
            })
            .eq('id', event.player_id);
        }
      }

      await supabase.from('match_events').delete().eq('id', eventId);

      setSuccess('Event deleted and stats reverted!');
      fetchMatchEvents(selectedMatch?.id || 0);
      fetchMatches();
      fetchPlayers();

    } catch (error: any) {
      setError(error.message || 'Failed to delete event');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.home_team_id === formData.away_team_id) {
      setError('Home and away teams cannot be the same');
      return;
    }

    // Check validation errors
    if (Object.keys(validationErrors).length > 0) {
      setError('Please fix the validation errors before saving');
      return;
    }

    setLoading(true);
    const matchPayload = {
      home_team_id: Number(formData.home_team_id),
      away_team_id: Number(formData.away_team_id),
      home_score: 0,
      away_score: 0,
      status: 'scheduled',
      matchweek: parseInt(formData.matchweek) || 1,
      date: formData.date,
      time: formData.time,
      stadium: formData.stadium,
      match_minute: 0,
      match_second: 0,
      match_half: 'first',
      injury_time_first_half: 0,
      injury_time_second_half: 0,
    };

    try {
      if (editingId) {
        await supabase.from('matches').update(matchPayload).eq('id', editingId);
        setSuccess('Fixture updated successfully!');
      } else {
        await supabase.from('matches').insert([matchPayload]);
        setSuccess('Fixture created successfully!');
      }
      resetForm();
      fetchMatches();
      setShowForm(false);
    } catch (error: any) {
      setError(error.message || 'Failed to save fixture');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (match: Match) => {
    setFormData({
      home_team_id: String(match.home_team_id),
      away_team_id: String(match.away_team_id),
      matchweek: String(match.matchweek),
      date: match.date,
      time: match.time || '',
      stadium: match.stadium || '',
    });
    setEditingId(match.id);
    setIsEditing(true);
    setShowForm(true);
    setValidationErrors({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this fixture? All associated stats will be reverted.')) return;

    try {
      await revertTeamStats(id);
      await revertPlayerStatsForMatch(id);
      await supabase.from('match_events').delete().eq('match_id', id);
      await supabase.from('matches').delete().eq('id', id);

      setSuccess('Fixture and all associated stats deleted!');
      fetchMatches();
      fetchPlayers();

    } catch (error: any) {
      setError(error.message || 'Failed to delete fixture');
    }
  };

  const handleManageEvents = (match: Match) => {
    setSelectedMatch(match);
    setCurrentMinute(match.match_minute || 0);
    setCurrentSecond(match.match_second || 0);
    setCurrentHalf((match.match_half as 'first' | 'second') || 'first');
    setInjuryTimeFirstHalf(match.injury_time_first_half || 0);
    setInjuryTimeSecondHalf(match.injury_time_second_half || 0);
    fetchMatchEvents(match.id);
    setShowEventForm(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setIsEditing(false);
    setError('');
    setSuccess('');
    setValidationErrors({});
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return { bg: 'rgba(230, 57, 70, 0.15)', color: '#e63946', text: '● LIVE' };
      case 'scheduled':
        return { bg: 'rgba(45, 106, 79, 0.15)', color: '#2d6a4f', text: 'Scheduled' };
      case 'finished':
        return { bg: 'rgba(106, 76, 147, 0.15)', color: '#6a4c93', text: 'Finished' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', color: '#999', text: status };
    }
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, string> = {
      goal: '⚽', assist: '🎯', yellow_card: '🟨', red_card: '🟥',
      substitution: '🔄', offside: '🚩', foul: '⚠️', penalty: '🔴', corner: '⤴️'
    };
    return icons[type] || '📋';
  };

  const filteredMatches = matches.filter(match => filter === 'all' || match.status === filter);
  const inputStyle = { background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' };

  if (loading && matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#ffd700] animate-spin" />
      </div>
    );
  }

  // Generate matchweek options (1-38)
  const matchweekOptions = Array.from({ length: 38 }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Manage Fixtures & Matches</h2>
          <p className="text-sm text-gray-400">Create fixtures, schedule matches, and manage live events</p>
        </div>
        {!showForm && !showEventForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-[#ffd700] text-black hover:scale-[1.02] transition-all">
            <Plus className="w-4 h-4" /> Create Fixture
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-500 text-sm">{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-500 text-sm">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4 text-green-400" /></button>
        </div>
      )}

      {/* Create/Edit Fixture Form */}
      {showForm && (
        <div className="rounded-xl p-6 mb-8" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Fixture' : 'Create New Fixture'}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }}><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          {/* Validation Warnings */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              {validationErrors.homeTeamConflict && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{validationErrors.homeTeamConflict}</span>
                </div>
              )}
              {validationErrors.awayTeamConflict && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{validationErrors.awayTeamConflict}</span>
                </div>
              )}
              {validationErrors.duplicateFixture && (
                <div className="flex items-center gap-2 text-yellow-500 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{validationErrors.duplicateFixture}</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Home Team</label>
                <select
                  value={formData.home_team_id}
                  onChange={(e) => setFormData({ ...formData, home_team_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-white" style={inputStyle} required
                >
                  <option value="">Select Home Team</option>
                  {teams.map(team => (<option key={team.id} value={team.id}>{team.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Away Team</label>
                <select
                  value={formData.away_team_id}
                  onChange={(e) => setFormData({ ...formData, away_team_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-white" style={inputStyle} required
                >
                  <option value="">Select Away Team</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id} disabled={team.id === Number(formData.home_team_id)}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Matchweek</label>
                <select
                  value={formData.matchweek}
                  onChange={(e) => setFormData({ ...formData, matchweek: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg text-white" style={inputStyle} required
                >
                  <option value="">Select Matchweek</option>
                  {matchweekOptions.map(week => (
                    <option key={week} value={week}>Matchweek {week}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Each team plays once per matchweek</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-white" style={inputStyle} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Kick-off Time</label>
                <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-white" style={inputStyle} required />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Stadium</label>
              <input type="text" value={formData.stadium} onChange={(e) => setFormData({ ...formData, stadium: e.target.value })} className="w-full px-4 py-2.5 rounded-lg text-white" style={inputStyle} />
            </div>

            <div className="bg-blue-500/10 p-3 rounded-lg">
              <p className="text-xs text-blue-400 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" />
                League rules: Each team plays exactly once per matchweek. Teams play each other twice per season (home and away).
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading || Object.keys(validationErrors).length > 0} className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold bg-[#ffd700] text-black disabled:opacity-50">
                <Save className="w-4 h-4" /> {isEditing ? 'Update Fixture' : 'Create Fixture'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-6 py-2.5 rounded-lg font-semibold text-gray-400">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Event Management Modal - Same as before */}
      {showEventForm && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'rgba(26, 31, 46, 0.95)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">{selectedMatch.homeTeam?.name} vs {selectedMatch.awayTeam?.name}</h3>
              <button onClick={() => { setShowEventForm(false); setSelectedMatch(null); if (timerRef.current) clearInterval(timerRef.current); }} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-6 h-6 text-gray-400" /></button>
            </div>

            {/* Live Timer */}
            <div className="mb-6 p-4 rounded-lg text-center" style={{ background: 'rgba(10, 14, 26, 0.5)' }}>
              <h4 className="text-white font-semibold mb-2 flex items-center justify-center gap-2">
                <Timer className="w-5 h-5 text-[#ffd700]" />
                Match Time
              </h4>
              <p className="text-5xl font-black text-[#ffd700] font-mono">
                {getDisplayTime()}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {currentHalf === 'first' ? 'First Half' : 'Second Half'}
              </p>
              {selectedMatch.status === 'live' && currentMinute < 90 && (
                <div className="mt-3 w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all duration-300" style={{ width: `${(currentMinute / 90) * 100}%` }} />
                </div>
              )}
            </div>

            {/* Injury Time Controls */}
            {selectedMatch.status === 'live' && currentMinute < 90 && (
              <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(10, 14, 26, 0.5)' }}>
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Injury Time
                </h4>

                {(currentHalf === 'first' || currentMinute === 45) && currentMinute >= 40 && (
                  <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255, 215, 0, 0.05)' }}>
                    <p className="text-sm text-gray-400 mb-2">
                      First Half: <span className="text-purple-400 font-bold">{injuryTimeFirstHalf} min added</span>
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={injuryTimeInput}
                        onChange={(e) => setInjuryTimeInput(e.target.value)}
                        placeholder="Minutes"
                        className="flex-1 px-3 py-2 rounded-lg text-white text-sm"
                        style={inputStyle}
                      />
                      <button onClick={() => addInjuryTime('first')} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-500 font-semibold text-sm">
                        Add to First Half
                      </button>
                    </div>
                  </div>
                )}

                {(currentHalf === 'second' || currentMinute >= 45) && currentMinute >= 80 && (
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(255, 215, 0, 0.05)' }}>
                    <p className="text-sm text-gray-400 mb-2">
                      Second Half: <span className="text-purple-400 font-bold">{injuryTimeSecondHalf} min added</span>
                    </p>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={injuryTimeInput}
                        onChange={(e) => setInjuryTimeInput(e.target.value)}
                        placeholder="Minutes"
                        className="flex-1 px-3 py-2 rounded-lg text-white text-sm"
                        style={inputStyle}
                      />
                      <button onClick={() => addInjuryTime('second')} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-500 font-semibold text-sm">
                        Add to Second Half
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add Goal Event */}
            <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(10, 14, 26, 0.5)' }}>
              <h4 className="text-white font-semibold mb-3">Add Goal at {getDisplayTime()}</h4>
              <form onSubmit={handleAddEvent} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Team</label>
                    <select value={eventData.team_id} onChange={(e) => setEventData({ ...eventData, team_id: e.target.value, player_id: '' })} className="w-full px-3 py-2 rounded-lg text-white text-sm" style={inputStyle} required>
                      <option value="">Select Team</option>
                      <option value={selectedMatch.home_team_id}>{selectedMatch.homeTeam?.name}</option>
                      <option value={selectedMatch.away_team_id}>{selectedMatch.awayTeam?.name}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Scorer</label>
                    <select value={eventData.player_id} onChange={(e) => setEventData({ ...eventData, player_id: e.target.value })} className="w-full px-3 py-2 rounded-lg text-white text-sm" style={inputStyle} required>
                      <option value="">Select Player</option>
                      {players.filter(p => p.team_id === Number(eventData.team_id)).map(player => (
                        <option key={player.id} value={player.id}>{player.name} (#{player.number}) - {player.position}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Assisted By (Optional)</label>
                  <select
                    value={eventData.assisted_by}
                    onChange={(e) => setEventData({ ...eventData, assisted_by: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm" style={inputStyle}
                  >
                    <option value="">No assist</option>
                    {players
                      .filter(p => p.team_id === Number(eventData.team_id) && p.id !== Number(eventData.player_id))
                      .map(player => (
                        <option key={player.id} value={player.id}>{player.name} (#{player.number})</option>
                      ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" checked={eventData.is_penalty} onChange={(e) => setEventData({ ...eventData, is_penalty: e.target.checked })} className="rounded" /> Penalty
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input type="checkbox" checked={eventData.is_own_goal} onChange={(e) => setEventData({ ...eventData, is_own_goal: e.target.checked })} className="rounded" /> Own Goal
                  </label>
                </div>

                <button type="submit" className="w-full py-2 rounded-lg bg-[#ffd700] text-black font-semibold text-sm">Add Goal</button>
              </form>
            </div>

            {/* Add Card Events */}
            <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(10, 14, 26, 0.5)' }}>
              <h4 className="text-white font-semibold mb-3">Add Card at {getDisplayTime()}</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Team</label>
                  <select
                    value={eventData.team_id}
                    onChange={(e) => setEventData({ ...eventData, team_id: e.target.value, player_id: '' })}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm" style={inputStyle}
                  >
                    <option value="">Select Team</option>
                    <option value={selectedMatch.home_team_id}>{selectedMatch.homeTeam?.name}</option>
                    <option value={selectedMatch.away_team_id}>{selectedMatch.awayTeam?.name}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Player</label>
                  <select
                    value={eventData.player_id}
                    onChange={(e) => setEventData({ ...eventData, player_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-white text-sm" style={inputStyle}
                  >
                    <option value="">Select Player</option>
                    {players.filter(p => p.team_id === Number(eventData.team_id)).map(player => (
                      <option key={player.id} value={player.id}>{player.name} (#{player.number})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleAddCardEvent('yellow_card')}
                  className="py-2 rounded-lg bg-yellow-500/20 text-yellow-500 font-semibold text-sm"
                >
                  🟨 Yellow Card
                </button>
                <button
                  onClick={() => handleAddCardEvent('red_card')}
                  className="py-2 rounded-lg bg-red-500/20 text-red-500 font-semibold text-sm"
                >
                  🟥 Red Card
                </button>
                <button
                  onClick={handleAddOffside}
                  className="py-2 rounded-lg bg-blue-500/20 text-blue-500 font-semibold text-sm"
                >
                  🚩 Offside
                </button>
              </div>
            </div>

            {/* End Match Button */}
            {selectedMatch.status === 'live' && (
              <div className="mb-6">
                <button onClick={finishMatch} className="w-full py-2 rounded-lg bg-red-500/20 text-red-500 font-semibold text-sm">
                  End Match
                </button>
              </div>
            )}

            {/* Events List */}
            <div>
              <h4 className="text-white font-semibold mb-3">Match Events ({matchEvents.length})</h4>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {matchEvents.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No events yet</p>
                ) : (
                  matchEvents.map((event) => {
                    const assistPlayer = event.assisted_by ? players.find(p => p.id === event.assisted_by) : null;
                    return (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(10, 14, 26, 0.5)' }}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getEventIcon(event.type)}</span>
                          <div>
                            <p className="text-white text-sm">
                              <span className="font-bold text-[#ffd700]">{event.minute}'</span> - {event.player_name}
                              {event.type === 'goal' && event.assisted_by && assistPlayer && (
                                <span className="text-gray-400 text-xs ml-1">(Assist: {assistPlayer.name})</span>
                              )}
                              {event.type === 'goal' && event.is_penalty && (
                                <span className="text-yellow-500 text-xs ml-1">(Penalty)</span>
                              )}
                              {event.type === 'goal' && event.is_own_goal && (
                                <span className="text-red-400 text-xs ml-1">(Own Goal)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteEvent(event.id)} className="p-1 hover:bg-red-500/10 rounded-lg">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto">
        <Filter className="w-4 h-4 text-gray-500" />
        {['all', 'scheduled', 'live', 'finished'].map((status) => (
          <button key={status} onClick={() => setFilter(status)} className="px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap" style={{ background: filter === status ? '#ffd700' : 'rgba(26, 31, 46, 0.8)', color: filter === status ? '#000' : '#999' }}>
            {status === 'all' ? 'All' : status === 'scheduled' ? 'Upcoming' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Fixtures/Matches List */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">
          {filter === 'all' ? 'All Fixtures' : filter === 'scheduled' ? 'Upcoming Fixtures' : filter === 'live' ? 'Live Matches' : 'Completed Matches'}
        </h3>
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No fixtures found</p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const badge = getStatusBadge(match.status);
            return (
              <div key={match.id} className="rounded-xl p-4" style={{ background: 'rgba(26, 31, 46, 0.8)', borderLeft: `4px solid ${match.homeTeam?.color || '#ffd700'}` }}>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.text}</span>
                      <span className="text-xs text-gray-500">MW {match.matchweek}</span>
                      <span className="text-xs text-gray-500">{new Date(match.date).toLocaleDateString()}</span>
                      <span className="text-xs text-gray-400">{match.time}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full" style={{ background: match.homeTeam?.color || '#666' }} /><span className="text-white font-bold text-sm">{match.homeTeam?.name || 'Unknown'}</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ background: match.awayTeam?.color || '#666' }} /><span className="text-white font-bold text-sm">{match.awayTeam?.name || 'Unknown'}</span></div>
                      </div>
                      {(match.status === 'live' || match.status === 'finished') && (
                        <div className="text-right">
                          <p className="text-white font-black text-lg">{match.home_score ?? '-'}</p>
                          <p className="text-white font-black text-lg">{match.away_score ?? '-'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {match.status === 'scheduled' && (
                      <button onClick={() => startMatch(match.id)} className="p-2 rounded-lg hover:bg-green-500/10 transition-colors" title="Start Match">
                        <Play className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                    <button onClick={() => handleEdit(match)} className="p-2 rounded-lg hover:bg-white/10"><Edit className="w-4 h-4 text-blue-400" /></button>
                    {(match.status === 'live' || match.status === 'finished') && (
                      <button onClick={() => handleManageEvents(match)} className="p-2 rounded-lg hover:bg-white/10">
                        <Activity className="w-4 h-4 text-green-400" title="Manage Events" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(match.id)} className="p-2 rounded-lg hover:bg-white/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
                {match.events && match.events.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/10">
                    <p className="text-xs text-gray-500">📋 {match.events.length} events</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}