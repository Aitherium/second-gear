// Levels: a table (width, depth), crates [x, y, z, size?, isTarget?] and dummies [x, z, isTarget?].
// Every red thing must leave the table. `par` is the shift count a tidy solution needs.
export const LEVELS = [
  {
    name: "1 · Warm-up",
    table: [8, 5],
    par: 1,
    crates: [[-1.5, 0.55, 0, 0.6, true], [1.5, 0.55, 0.8, 0.6, true]],
    dummies: [],
  },
  {
    name: "2 · Stack",
    table: [8, 5],
    par: 1,
    crates: [
      [0, 0.55, 0, 0.6], [0, 1.15, 0, 0.6], [0, 1.75, 0, 0.6, true],
      [-2.2, 0.55, -1, 0.6, true], [2.4, 0.55, 1.2, 0.6, true],
    ],
    dummies: [],
  },
  {
    name: "3 · Bystanders",
    table: [9, 6],
    par: 2,
    crates: [[-3, 0.55, -1.8, 0.6], [3, 0.55, 1.8, 0.6], [0, 0.55, -2.2, 0.6, true]],
    dummies: [[-1.2, 0.6, true], [1.4, -0.6, true], [0, 1.6, false]],
  },
];
