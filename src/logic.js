const { WORDS } = require("./words");
const { PROMPTS } = require("./prompts");

const MAX_PLAYERS = 16;
const CARD_SIZE = 25;

const BINGO_LINES = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

function hashString(str) {
  let h = 2166136261;
  const value = String(str);
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(items, seed) {
  const arr = items.slice();
  let a = hashString(seed);
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function pairIndex(hunterSeat, targetSeat, maxPlayers = MAX_PLAYERS) {
  if (hunterSeat === targetSeat) {
    throw new Error("A player does not have a word for themselves");
  }
  const adjusted = targetSeat > hunterSeat ? targetSeat - 1 : targetSeat;
  return hunterSeat * (maxPlayers - 1) + adjusted;
}

const deckCache = new Map();

function wordDeck(gameCode) {
  const key = String(gameCode || "").toUpperCase();
  if (!deckCache.has(key)) {
    deckCache.set(key, seededShuffle(WORDS, `words::${key}`));
  }
  return deckCache.get(key);
}

function wordFor(gameCode, hunterSeat, targetSeat) {
  const index = pairIndex(hunterSeat, targetSeat);
  const deck = wordDeck(gameCode);
  if (index < 0 || index >= deck.length) {
    throw new Error("Not enough words for this table");
  }
  return deck[index];
}

function buildCard(gameCode, playerId) {
  const deck = seededShuffle(PROMPTS, `${String(gameCode).toUpperCase()}::card::${playerId}`);
  return deck.slice(0, CARD_SIZE);
}

function sanitizeName(name) {
  return String(name || "").replace(/\s+/g, " ").trim().slice(0, 24);
}

function sanitizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function isValidCode(code) {
  return /^[A-Z0-9]{6}$/.test(sanitizeCode(code));
}

function emptyState() {
  return { players: [], marks: {}, heard: {}, winners: {} };
}

function cloneState(state) {
  return {
    players: state.players.map((player) => ({ ...player })),
    marks: Object.fromEntries(
      Object.entries(state.marks || {}).map(([playerId, cells]) => [
        playerId,
        Object.fromEntries(Object.entries(cells || {}).map(([cell, mark]) => [cell, { ...mark }])),
      ]),
    ),
    heard: Object.fromEntries(
      Object.entries(state.heard || {}).map(([hunterId, targets]) => [
        hunterId,
        Object.fromEntries(Object.entries(targets || {}).map(([targetId, hit]) => [targetId, { ...hit }])),
      ]),
    ),
    winners: Object.fromEntries(Object.entries(state.winners || {}).map(([id, win]) => [id, { ...win }])),
  };
}

function byOrder(a, b) {
  if (a.order !== b.order) return a.order - b.order;
  return String(a.id).localeCompare(String(b.id));
}

function seatOf(players, id) {
  return players.findIndex((player) => player.id === id);
}

function isFilled(cells, index) {
  const mark = cells?.[index] ?? cells?.[String(index)];
  return Boolean(mark && mark.giverId && !mark.cleared);
}

function conflictingCells(cells, cell, giverId) {
  const found = [];
  const target = Number(cell);
  if (!giverId || !Number.isInteger(target)) return found;
  for (const line of BINGO_LINES) {
    if (!line.includes(target)) continue;
    for (const index of line) {
      if (index === target || found.includes(index)) continue;
      const mark = cells?.[index] ?? cells?.[String(index)];
      if (mark && mark.giverId === giverId && !mark.cleared) found.push(index);
    }
  }
  return found;
}

function hasBingo(cells) {
  if (!cells) return false;
  return BINGO_LINES.some((line) => line.every((index) => isFilled(cells, index)));
}

function winningCells(cells) {
  const won = new Set();
  if (!cells) return won;
  for (const line of BINGO_LINES) {
    if (line.every((index) => isFilled(cells, index))) {
      line.forEach((index) => won.add(index));
    }
  }
  return won;
}

function displayName(player, players) {
  const name = player?.name || "Friend";
  const same = (players || []).filter(
    (other) => other.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (same.length < 2) return name;
  const seat = players.findIndex((other) => other.id === player.id);
  return `${name} (${seat + 1})`;
}

function applyEvent(state, event, gameCode) {
  const next = cloneState(state || emptyState());
  const type = event?.type;
  let accepted = false;

  if (type === "join") {
    const id = String(event.id || "");
    const name = sanitizeName(event.name);
    const order = Number(event.order);
    if (id && name && Number.isFinite(order) && !next.players.some((player) => player.id === id)) {
      if (next.players.length < MAX_PLAYERS) {
        next.players.push({ id, name, order });
        next.players.sort(byOrder);
        accepted = true;
      }
    }
  } else if (type === "rename") {
    const player = next.players.find((item) => item.id === event.id);
    const name = sanitizeName(event.name);
    const at = Number(event.at) || 0;
    if (player && name && at >= (player.nameAt || 0)) {
      player.name = name;
      player.nameAt = at;
      accepted = true;
    }
  } else if (type === "mark") {
    const playerId = String(event.playerId || "");
    const cell = Number(event.cell);
    const at = Number(event.at) || 0;
    if (playerId && cell >= 0 && cell < CARD_SIZE && next.players.some((player) => player.id === playerId)) {
      const card = buildCard(gameCode, playerId);
      if (card[cell] === event.prompt) {
        if (!next.marks[playerId]) next.marks[playerId] = {};
        const prev = next.marks[playerId][String(cell)];
        if (!prev || at >= (prev.at || 0)) {
          if (event.giverId) {
            const giver = next.players.find((player) => player.id === event.giverId);
            if (giver && giver.id !== playerId && conflictingCells(next.marks[playerId], cell, giver.id).length === 0) {
              next.marks[playerId][String(cell)] = {
                giverId: giver.id,
                giverName: giver.name,
                prompt: event.prompt,
                at,
                cleared: false,
              };
              accepted = true;
            }
          } else {
            next.marks[playerId][String(cell)] = {
              giverId: null,
              giverName: "",
              prompt: event.prompt,
              at,
              cleared: true,
            };
            accepted = true;
          }
        }
      }
    }
  } else if (type === "keyword") {
    const hunter = next.players.find((player) => player.id === event.hunterId);
    const target = next.players.find((player) => player.id === event.targetId);
    if (hunter && target && hunter.id !== target.id) {
      const expected = wordFor(gameCode, seatOf(next.players, hunter.id), seatOf(next.players, target.id));
      if (event.word === expected) {
        if (!next.heard[hunter.id]) next.heard[hunter.id] = {};
        if (!next.heard[hunter.id][target.id]) {
          next.heard[hunter.id][target.id] = { word: expected, at: Number(event.at) || Date.now() };
          accepted = true;
        }
      }
    }
  } else if (type === "bingo") {
    const player = next.players.find((item) => item.id === event.playerId);
    if (player && !next.winners[player.id] && hasBingo(next.marks[player.id])) {
      next.winners[player.id] = { name: player.name, at: Number(event.at) || Date.now() };
      accepted = true;
    }
  }

  return { state: next, accepted };
}

function mergeSnapshot(local, snapshot, gameCode) {
  let state = cloneState(local || emptyState());
  const snap = snapshot || {};
  for (const player of snap.players || []) {
    const applied = applyEvent(state, {
      type: "join",
      id: player.id,
      name: player.name,
      order: player.order,
    }, gameCode);
    state = applied.state;
    if (player.nameAt) {
      const renamed = applyEvent(state, {
        type: "rename",
        id: player.id,
        name: player.name,
        at: player.nameAt,
      }, gameCode);
      state = renamed.state;
    }
  }
  for (const [playerId, cells] of Object.entries(snap.marks || {})) {
    for (const [cell, mark] of Object.entries(cells || {})) {
      const applied = applyEvent(state, {
        type: "mark",
        playerId,
        cell: Number(cell),
        prompt: mark.prompt,
        giverId: mark.cleared ? null : mark.giverId,
        at: mark.at,
      }, gameCode);
      state = applied.state;
    }
  }
  for (const [hunterId, targets] of Object.entries(snap.heard || {})) {
    for (const [targetId, hit] of Object.entries(targets || {})) {
      const applied = applyEvent(state, {
        type: "keyword",
        hunterId,
        targetId,
        word: hit.word,
        at: hit.at,
      }, gameCode);
      state = applied.state;
    }
  }
  for (const [playerId, win] of Object.entries(snap.winners || {})) {
    const applied = applyEvent(state, {
      type: "bingo",
      playerId,
      name: win.name,
      at: win.at,
    }, gameCode);
    state = applied.state;
  }
  return state;
}

function toSnapshot(state) {
  return {
    type: "snapshot",
    players: (state.players || []).map((player) => ({
      id: player.id,
      name: player.name,
      order: player.order,
      nameAt: player.nameAt || 0,
    })),
    marks: state.marks || {},
    heard: state.heard || {},
    winners: state.winners || {},
  };
}

function stateCounts(state) {
  let marks = 0;
  for (const cells of Object.values(state.marks || {})) {
    for (const mark of Object.values(cells || {})) {
      if (mark?.giverId && !mark.cleared) marks += 1;
    }
  }
  let heard = 0;
  for (const targets of Object.values(state.heard || {})) {
    heard += Object.keys(targets || {}).length;
  }
  return {
    players: (state.players || []).length,
    marks,
    heard,
    winners: Object.keys(state.winners || {}).length,
  };
}

function countsCover(mine, other) {
  return (
    other.players >= mine.players &&
    other.marks >= mine.marks &&
    other.heard >= mine.heard &&
    other.winners >= mine.winners
  );
}

function foldEvent(state, event, gameCode, pending) {
  let waiting = Array.isArray(pending) ? pending.slice() : [];
  const applied = applyEvent(state, event, gameCode);
  let next = applied.accepted ? applied.state : state;
  let changed = applied.accepted;

  if (event?.type === "bingo" && !applied.accepted) {
    const playerId = String(event.playerId || "");
    if (playerId && !next.winners?.[playerId]) {
      waiting = waiting.filter((item) => item.playerId !== playerId);
      waiting.push(event);
    }
  }

  const still = [];
  for (const bingo of waiting) {
    if (!bingo || next.winners?.[bingo.playerId]) continue;
    const retry = applyEvent(next, bingo, gameCode);
    if (retry.accepted) {
      next = retry.state;
      changed = true;
    } else {
      still.push(bingo);
    }
  }

  return {
    state: changed ? next : state,
    accepted: changed,
    pending: still,
  };
}

function noticesForUpdate(previous, next, clientId, event) {
  const notices = [];
  const prior = previous || emptyState();
  const current = next || emptyState();
  if (event?.type === "keyword" && event.targetId === clientId) {
    const hunterId = String(event.hunterId || "");
    const hit = current.heard?.[hunterId]?.[clientId];
    if (hit && !prior.heard?.[hunterId]?.[clientId]) {
      const hunter = (current.players || []).find((player) => player.id === hunterId);
      notices.push({
        id: `kw-${hunterId}-${clientId}`,
        kind: "keyword",
        hunterName: hunter?.name || "Someone",
        word: hit.word,
        targetId: clientId,
      });
    }
  }
  for (const [playerId, win] of Object.entries(current.winners || {})) {
    if (prior.winners?.[playerId]) continue;
    notices.push({
      id: `bingo-${playerId}`,
      kind: "bingo",
      name: win.name,
    });
    if (playerId === clientId) {
      notices.push({
        id: `self-bingo-${playerId}`,
        kind: "self-bingo",
        name: win.name,
      });
    }
  }
  return notices;
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

module.exports = {
  MAX_PLAYERS,
  CARD_SIZE,
  BINGO_LINES,
  WORDS,
  PROMPTS,
  hashString,
  seededShuffle,
  pairIndex,
  wordFor,
  buildCard,
  sanitizeName,
  sanitizeCode,
  isValidCode,
  emptyState,
  hasBingo,
  conflictingCells,
  winningCells,
  displayName,
  applyEvent,
  mergeSnapshot,
  toSnapshot,
  stateCounts,
  countsCover,
  foldEvent,
  noticesForUpdate,
  makeCode,
};
