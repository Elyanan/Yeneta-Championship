import type { Lineup } from "@/types/championship";

export function substitutionState(lineup: Lineup) {
  const onField = lineup.players.map((p) => p.athleteId);
  let remainingBench = [...(lineup.substitutes || [])];
  const ids = new Set<string>();
  for (const change of lineup.substitutions || []) {
    if (ids.has(change.id))
      return {
        onField,
        remainingBench,
        error: "Substitution IDs must be unique.",
      };
    ids.add(change.id);
    const index = onField.indexOf(change.outgoingId);
    if (index < 0)
      return {
        onField,
        remainingBench,
        error: "Choose a player currently in the lineup to come off.",
      };
    if (!remainingBench.includes(change.incomingId))
      return {
        onField,
        remainingBench,
        error: "Choose an unused player from the bench to come on.",
      };
    onField[index] = change.incomingId;
    remainingBench = remainingBench.filter((id) => id !== change.incomingId);
  }
  return { onField, remainingBench, error: undefined };
}

// Keep independent changes when the lineup, bench, or an earlier change is edited.
export function reconcileSubstitutions(lineup: Lineup): Lineup {
  if (!lineup.substitutions) return lineup;
  const kept: NonNullable<Lineup["substitutions"]> = [];
  for (const change of lineup.substitutions) {
    if (
      !substitutionState({ ...lineup, substitutions: [...kept, change] }).error
    )
      kept.push(change);
  }
  return { ...lineup, substitutions: kept };
}
