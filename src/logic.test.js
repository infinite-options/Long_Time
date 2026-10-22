const assert = require("assert");
const {
  WORDS,
  PROMPTS,
  MAX_PLAYERS,
  pairIndex,
  wordFor,
  buildCard,
  hasBingo,
  winningCells,
  applyEvent,
  mergeSnapshot,
  emptyState,
  displayName,
  stateCounts,
  countsCover,
} = require("./logic");

function seats(n) {
  return Array.from({ length: n }, (_, index) => ({
    id: `p${index}`,
    name: `Friend ${index}`,
    order: index,
  }));
}

function withPlayers(n) {
  let state = emptyState();
  for (let i = 0; i < n; i += 1) {
    state = applyEvent(state, { type: "join", id: `p${i}`, name: `Friend ${i}`, order: i }, "TABLE1").state;
  }
  return state;
}

assert.strictEqual(PROMPTS.length, 30);
assert.ok(WORDS.length >= MAX_PLAYERS * (MAX_PLAYERS - 1), `need 240 words, have ${WORDS.length}`);
assert.strictEqual(new Set(WORDS).size, WORDS.length);

const indexes = new Set();
for (let hunter = 0; hunter < MAX_PLAYERS; hunter += 1) {
  for (let target = 0; target < MAX_PLAYERS; target += 1) {
    if (hunter === target) continue;
    indexes.add(pairIndex(hunter, target));
  }
}
assert.strictEqual(indexes.size, MAX_PLAYERS * (MAX_PLAYERS - 1));

const dealt = new Set();
for (let hunter = 0; hunter < 11; hunter += 1) {
  for (let target = 0; target < 11; target += 1) {
    if (hunter === target) continue;
    dealt.add(wordFor("AB12CD", hunter, target));
  }
}
assert.strictEqual(dealt.size, 11 * 10);
assert.notStrictEqual(wordFor("AB12CD", 0, 1), wordFor("AB12CD", 1, 0));
assert.strictEqual(wordFor("AB12CD", 3, 7), wordFor("ab12cd", 3, 7));

const cardA = buildCard("AB12CD", "player-a");
const cardB = buildCard("AB12CD", "player-b");
assert.strictEqual(cardA.length, 25);
assert.strictEqual(new Set(cardA).size, 25);
assert.ok(cardA.every((prompt) => PROMPTS.includes(prompt)));
assert.notStrictEqual(cardA.join("|"), cardB.join("|"));
assert.strictEqual(buildCard("AB12CD", "player-a").join("|"), cardA.join("|"));

const row = {};
for (let i = 0; i < 5; i += 1) row[i] = { giverId: "x" };
assert.strictEqual(hasBingo(row), true);
const almost = { 0: { giverId: "x" }, 1: { giverId: "x" }, 2: { giverId: "x" }, 3: { giverId: "x" } };
assert.strictEqual(hasBingo(almost), false);
const diagonal = {};
[0, 6, 12, 18, 24].forEach((cell) => {
  diagonal[cell] = { giverId: "x" };
});
assert.strictEqual(hasBingo(diagonal), true);
assert.strictEqual(winningCells(diagonal).size, 5);
const cleared = { ...row, 4: { giverId: null, cleared: true } };
assert.strictEqual(hasBingo(cleared), false);

let state = withPlayers(3);
const card = buildCard("TABLE1", "p0");
state = applyEvent(state, {
  type: "mark",
  playerId: "p0",
  cell: 0,
  prompt: card[0],
  giverId: "p1",
  at: 10,
}, "TABLE1").state;
assert.strictEqual(state.marks.p0["0"].giverId, "p1");

const spoof = applyEvent(state, {
  type: "mark",
  playerId: "p0",
  cell: 1,
  prompt: "Not a real square",
  giverId: "p2",
  at: 11,
}, "TABLE1");
assert.strictEqual(spoof.accepted, false);

state = applyEvent(state, {
  type: "mark",
  playerId: "p0",
  cell: 0,
  prompt: card[0],
  giverId: null,
  at: 12,
}, "TABLE1").state;
assert.strictEqual(state.marks.p0["0"].cleared, true);

const stale = applyEvent(state, {
  type: "mark",
  playerId: "p0",
  cell: 0,
  prompt: card[0],
  giverId: "p2",
  at: 9,
}, "TABLE1");
assert.strictEqual(stale.state.marks.p0["0"].cleared, true);

const word = wordFor("TABLE1", 0, 1);
const heard = applyEvent(state, {
  type: "keyword",
  hunterId: "p0",
  targetId: "p1",
  word,
  at: 20,
}, "TABLE1");
assert.strictEqual(heard.accepted, true);
assert.strictEqual(heard.state.heard.p0.p1.word, word);
const fakeWord = applyEvent(heard.state, {
  type: "keyword",
  hunterId: "p0",
  targetId: "p2",
  word: "not-the-word",
  at: 21,
}, "TABLE1");
assert.strictEqual(fakeWord.accepted, false);

const fakeBingo = applyEvent(heard.state, { type: "bingo", playerId: "p0", name: "Impostor", at: 30 }, "TABLE1");
assert.strictEqual(fakeBingo.accepted, false);

let winner = withPlayers(2);
const winnerCard = buildCard("TABLE1", "p0");
for (let cell = 0; cell < 5; cell += 1) {
  winner = applyEvent(winner, {
    type: "mark",
    playerId: "p0",
    cell,
    prompt: winnerCard[cell],
    giverId: "p1",
    at: 40 + cell,
  }, "TABLE1").state;
}
const bingo = applyEvent(winner, { type: "bingo", playerId: "p0", name: "Impostor", at: 50 }, "TABLE1");
assert.strictEqual(bingo.accepted, true);
assert.strictEqual(bingo.state.winners.p0.name, "Friend 0");

const merged = mergeSnapshot(emptyState(), {
  players: seats(2),
  marks: winner.marks,
  heard: {},
  winners: {},
}, "TABLE1");
assert.strictEqual(merged.players.length, 2);
assert.strictEqual(merged.marks.p0["0"].giverId, "p1");
const mergedWin = mergeSnapshot(merged, { players: seats(2), marks: winner.marks, heard: {}, winners: bingo.state.winners }, "TABLE1");
assert.ok(mergedWin.winners.p0);

const names = [
  { id: "a", name: "Sam" },
  { id: "b", name: "Sam" },
];
assert.strictEqual(displayName(names[0], names), "Sam (1)");
assert.strictEqual(displayName(names[1], names), "Sam (2)");

const counts = stateCounts(bingo.state);
assert.ok(countsCover({ players: 1, marks: 0, heard: 0, winners: 0 }, counts));
assert.strictEqual(countsCover(counts, { players: 2, marks: 0, heard: 0, winners: 0 }), false);

console.log(`logic ok · ${WORDS.length} words · ${PROMPTS.length} prompts`);
