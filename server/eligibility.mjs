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
