export const formationIds = [
  "4-3-3",
  "4-4-2",
  "4-2-3-1",
  "3-5-2",
  "3-4-3",
  "2-3-1",
  "2-2",
] as const;
export type FormationId = (typeof formationIds)[number];
const rows: Record<FormationId, string[][]> = {
  "4-3-3": [
    ["GK"],
    ["LB", "LCB", "RCB", "RB"],
    ["LCM", "CDM", "RCM"],
    ["LW", "ST", "RW"],
  ],
  "4-4-2": [
    ["GK"],
    ["LB", "LCB", "RCB", "RB"],
    ["LM", "LCM", "RCM", "RM"],
    ["LS", "RS"],
  ],
  "4-2-3-1": [
    ["GK"],
    ["LB", "LCB", "RCB", "RB"],
    ["LDM", "RDM"],
    ["LAM", "CAM", "RAM"],
    ["ST"],
  ],
  "3-5-2": [
    ["GK"],
    ["LCB", "CB", "RCB"],
    ["LWB", "LCM", "CDM", "RCM", "RWB"],
    ["LS", "RS"],
  ],
  "3-4-3": [
    ["GK"],
    ["LCB", "CB", "RCB"],
    ["LM", "LCM", "RCM", "RM"],
    ["LW", "ST", "RW"],
  ],
  "2-3-1": [["GK"], ["LCB", "RCB"], ["LM", "CM", "RM"], ["ST"]],
  "2-2": [["GK"], ["LCB", "RCB"], ["LS", "RS"]],
};
export function formationSlots(id: FormationId) {
  const lines = rows[id];
  return lines.flatMap((line, row) =>
    line.map((position, index) => ({
      position,
      x: ((index + 0.5) / line.length) * 100,
      y: 88 - (row / (lines.length - 1)) * 76,
    })),
  );
}
