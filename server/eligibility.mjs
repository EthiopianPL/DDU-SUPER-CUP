export function participation(squadRows, events) {
  const state = new Map();
  for (const row of squadRows) {
    state.set(row.player_id, {
      teamId: row.team_id,
      on: row.role === 'starter',
      used: row.role === 'starter',
      dismissed: false,
    });
  }

  const ordered = [...events].filter((event) => !event.voided).sort((left, right) => left.id - right.id);
  for (const event of ordered) {
    if (event.type === 'substitution') {
      const outgoing = state.get(event.player_id);
      const incoming = state.get(event.related_player_id);
      if (outgoing) outgoing.on = false;
      if (incoming) {
        incoming.on = true;
        incoming.used = true;
      }
    }
    if (event.type === 'card' && (event.card_type === 'red' || event.card_type === 'second_yellow')) {
      const player = state.get(event.player_id);
      if (player) {
        player.dismissed = true;
        player.on = false;
      }
    }
  }
  return state;
}

export function yellowCount(events, playerId) {
  return events.filter((event) => !event.voided && event.type === 'card' && event.player_id === playerId && event.card_type === 'yellow').length;
}

export function substitutionCount(events, teamId) {
  return events.filter((event) => !event.voided && event.type === 'substitution' && event.team_id === teamId).length;
}

export function checkPlayerSuspension(teamMatches, events, playerId, targetMatchId) {
  const sorted = [...teamMatches]
    .filter((m) => m.status !== 'cancelled' && m.status !== 'abandoned')
    .sort((a, b) => {
      const dateA = a.kickoff_date || a.date || '';
      const dateB = b.kickoff_date || b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.kickoff_time || a.time || '';
      const timeB = b.kickoff_time || b.time || '';
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return String(a.id).localeCompare(String(b.id));
    });

  let accumulatedYellows = 0;
  let servingRedSuspension = false;
  let servingYellowSuspension = false;

  for (const match of sorted) {
    if (match.id === targetMatchId) {
      if (servingRedSuspension) {
        return {
          suspended: true,
          reason: 'red_card',
          detail: 'Suspended (Red card in previous match)',
        };
      }
      if (servingYellowSuspension) {
        return {
          suspended: true,
          reason: 'yellow_cards',
          detail: 'Suspended (Accumulated 5 yellow cards)',
        };
      }
      return { suspended: false };
    }

    const isFinished = match.status === 'finished' || match.detail === 'finished';
    if (isFinished) {
      if (servingRedSuspension) servingRedSuspension = false;
      if (servingYellowSuspension) servingYellowSuspension = false;
    }

    const matchEvents = events.filter((e) => !e.voided && (e.match_id === match.id || e.matchId === match.id));
    for (const e of matchEvents) {
      if (e.player_id === playerId || e.playerId === playerId) {
        if (e.type === 'card') {
          const card = e.card_type || e.cardType;
          if (card === 'red' || card === 'second_yellow') {
            servingRedSuspension = true;
          } else if (card === 'yellow') {
            accumulatedYellows += 1;
            if (accumulatedYellows > 0 && accumulatedYellows % 5 === 0) {
              servingYellowSuspension = true;
            }
          }
        }
      }
    }
  }

  if (servingRedSuspension) {
    return {
      suspended: true,
      reason: 'red_card',
      detail: 'Suspended (Red card in previous match)',
    };
  }
  if (servingYellowSuspension) {
    return {
      suspended: true,
      reason: 'yellow_cards',
      detail: 'Suspended (Accumulated 5 yellow cards)',
    };
  }

  return { suspended: false };
}
