import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  applyEvent,
  buildCard,
  countsCover,
  emptyState,
  foldEvent,
  hasBingo,
  hashString,
  mergeSnapshot,
  noticesForUpdate,
  sanitizeName,
  stateCounts,
  toSnapshot,
  wordFor,
} from "./logic";
import { loadRoom, saveRoom } from "./storage";

const PRACTICE_CODE = "PRACTICE";
const PRACTICE_FRIENDS = ["Jordan", "Sam", "Riley", "Casey", "Morgan", "Quinn", "Avery", "Taylor", "Reese", "Drew"];

function loadAbly() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.Ably) return window.Ably;
  return require("ably");
}

function practiceState(clientId, name) {
  let state = emptyState();
  const people = [
    { id: clientId, name: sanitizeName(name) || "Alex", order: 1 },
    ...PRACTICE_FRIENDS.map((friend, index) => ({
      id: `practice-${index}`,
      name: friend,
      order: index + 2,
    })),
  ];
  for (const person of people) {
    state = applyEvent(
      state,
      { type: "join", id: person.id, name: person.name, order: person.order },
      PRACTICE_CODE,
    ).state;
  }
  return state;
}

async function readHistory(channel) {
  const items = [];
  let page = await channel.history({ limit: 100, direction: "forwards" });
  while (page) {
    items.push(...(page.items || []));
    const more = typeof page.hasNext === "function" ? page.hasNext() : Boolean(page.hasNext);
    if (!more || typeof page.next !== "function") break;
    page = await page.next();
  }
  items.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || String(a.id).localeCompare(String(b.id)));
  return items;
}

export function useGame({ code, name, clientId, preview, ablyKey }) {
  const roomCode = preview ? PRACTICE_CODE : code;
  const [state, setState] = useState(emptyState);
  const [online, setOnline] = useState({});
  const [connection, setConnection] = useState(preview ? "live" : "connecting");
  const [error, setError] = useState("");
  const [notices, setNotices] = useState([]);
  const [attempt, setAttempt] = useState(0);

  const stateRef = useRef(state);
  const channelRef = useRef(null);
  const outboxRef = useRef([]);
  const flushingRef = useRef(false);
  const seenRef = useRef(new Set());
  const toastedRef = useRef(new Set());
  const announcedRef = useRef(false);
  const pendingBingoRef = useRef([]);
  const syncedRef = useRef(false);
  const nameRef = useRef(name);
  const snapshotTimerRef = useRef(null);
  const peerCountsRef = useRef({ players: 0, marks: 0, heard: 0, winners: 0 });
  nameRef.current = name;

  const commit = useCallback((next) => {
    stateRef.current = next;
    setState(next);
    if (roomCode) saveRoom(roomCode, next).catch(() => {});
  }, [roomCode]);

  const pushNotice = useCallback((notice) => {
    if (toastedRef.current.has(notice.id)) return;
    toastedRef.current.add(notice.id);
    setNotices((current) => [...current, notice]);
  }, []);

  const dismissNotice = useCallback((id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const announceFrom = useCallback((previous, next, event) => {
    for (const notice of noticesForUpdate(previous, next, clientId, event)) {
      pushNotice(notice);
    }
  }, [clientId, pushNotice]);

  const buildBingo = useCallback((next) => {
    if (!preview && !syncedRef.current) return null;
    if (announcedRef.current) return null;
    if (next?.winners?.[clientId]) {
      announcedRef.current = true;
      return null;
    }
    if (!hasBingo(next?.marks?.[clientId])) return null;
    const me = next.players?.find((player) => player.id === clientId);
    if (!me) return null;
    return {
      type: "bingo",
      playerId: clientId,
      name: me.name,
      at: Date.now(),
    };
  }, [clientId, preview]);

  const ingest = useCallback((event, { live }) => {
    const previous = stateRef.current;
    const folded = foldEvent(previous, event, roomCode, pendingBingoRef.current);
    pendingBingoRef.current = folded.pending;
    if (!folded.accepted) return false;
    commit(folded.state);
    if (live) announceFrom(previous, folded.state, event);
    return true;
  }, [announceFrom, commit, roomCode]);

  const publishRef = useRef(() => false);

  const publishOwnBingo = useCallback(() => {
    const bingoEvent = buildBingo(stateRef.current);
    if (bingoEvent) publishRef.current(bingoEvent);
  }, [buildBingo]);

  const ingestSnapshot = useCallback((snapshot, { live }) => {
    const previous = stateRef.current;
    const merged = mergeSnapshot(previous, snapshot, roomCode);
    const caughtUp = foldEvent(merged, { type: "catchup" }, roomCode, pendingBingoRef.current);
    pendingBingoRef.current = caughtUp.pending;
    const next = caughtUp.state;
    commit(next);
    peerCountsRef.current = stateCounts({
      players: snapshot.players || [],
      marks: snapshot.marks || {},
      heard: snapshot.heard || {},
      winners: snapshot.winners || {},
    });
    if (live) announceFrom(previous, next, { type: "snapshot" });
    publishOwnBingo();
  }, [announceFrom, commit, publishOwnBingo, roomCode]);

  const flushRef = useRef(async () => {});
  const scheduleSnapshotRef = useRef(() => {});

  const flush = useCallback(async () => {
    if (preview || flushingRef.current) return;
    const channel = channelRef.current;
    if (!channel) return;
    flushingRef.current = true;
    try {
      while (outboxRef.current.length && channelRef.current) {
        const event = outboxRef.current[0];
        await channelRef.current.publish("event", event);
        outboxRef.current.shift();
      }
    } catch (err) {
      setError(err?.message || "The table hiccuped. We'll keep trying.");
    } finally {
      flushingRef.current = false;
    }
  }, [preview]);

  flushRef.current = flush;

  const publish = useCallback((event) => {
    const accepted = ingest(event, { live: true });
    if (!accepted) return false;
    const extras = [];
    if (event.type === "bingo" && event.playerId === clientId) announcedRef.current = true;
    if (event.type === "mark") {
      const bingoEvent = buildBingo(stateRef.current);
      if (bingoEvent) {
        const bingoAccepted = ingest(bingoEvent, { live: true });
        if (bingoAccepted) {
          announcedRef.current = true;
          extras.push(bingoEvent);
        }
      }
    }
    if (preview) return true;
    outboxRef.current.push(event, ...extras);
    if ((event.type === "bingo" && event.playerId === clientId) || extras.length) {
      scheduleSnapshotRef.current();
    }
    flushRef.current();
    return true;
  }, [buildBingo, clientId, ingest, preview]);

  publishRef.current = publish;

  const publishSnapshot = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || preview) return;
    const counts = stateCounts(stateRef.current);
    if (counts.players === 0) return;
    if (countsCover(counts, peerCountsRef.current)) return;
    channel.publish("snapshot", toSnapshot(stateRef.current)).catch(() => {});
  }, [preview]);

  const scheduleSnapshot = useCallback(() => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    const wait = 180 + (hashString(clientId) % 420);
    snapshotTimerRef.current = setTimeout(() => {
      publishSnapshot();
    }, wait);
  }, [clientId, publishSnapshot]);

  scheduleSnapshotRef.current = scheduleSnapshot;

  useEffect(() => {
    let cancelled = false;
    const clientBag = { client: null, channel: null };

    async function closeClient() {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
      try {
        await clientBag.channel?.presence.leave();
      } catch {
        /* already gone */
      }
      try {
        clientBag.channel?.unsubscribe();
      } catch {
        /* already gone */
      }
      try {
        clientBag.client?.close();
      } catch {
        /* already gone */
      }
      if (channelRef.current === clientBag.channel) channelRef.current = null;
    }

    if (preview) {
      syncedRef.current = true;
      announcedRef.current = false;
      pendingBingoRef.current = [];
      (async () => {
        const stored = await loadRoom(PRACTICE_CODE);
        if (cancelled) return;
        let next = stored?.players?.some((player) => player.id === clientId)
          ? stored
          : practiceState(clientId, nameRef.current);
        const me = next.players.find((player) => player.id === clientId);
        const wanted = sanitizeName(nameRef.current) || me?.name || "Alex";
        if (me && me.name !== wanted) {
          next = applyEvent(next, { type: "rename", id: clientId, name: wanted, at: Date.now() }, PRACTICE_CODE).state;
        }
        if (next.winners?.[clientId]) announcedRef.current = true;
        commit(next);
        setConnection("live");
        setError("");
        publishOwnBingo();
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!ablyKey) {
      setConnection("error");
      setError("Add EXPO_PUBLIC_ABLY_API_KEY to .env, then restart Expo.");
      return undefined;
    }

    syncedRef.current = false;
    announcedRef.current = false;
    pendingBingoRef.current = [];
    seenRef.current = new Set();
    setConnection("connecting");
    setError("");

    (async () => {
      try {
        const Ably = loadAbly();
        const client = new Ably.Realtime({
          key: ablyKey,
          clientId,
          echoMessages: true,
          logLevel: 1,
        });
        clientBag.client = client;
        const channel = client.channels.get(`reunion:${roomCode}`);
        clientBag.channel = channel;
        channelRef.current = channel;

        const buffer = [];
        let ready = false;
        const onMessage = (message) => {
          if (!ready) buffer.push(message);
          else applyMessage(message, true);
        };

        const applyMessage = (message, live) => {
          if (!message) return;
          if (message.id && seenRef.current.has(message.id)) return;
          if (message.id) seenRef.current.add(message.id);
          const data = message.data || {};
          if (message.name === "snapshot" || data.type === "snapshot") {
            ingestSnapshot(data, { live: live && syncedRef.current });
            return;
          }
          if (message.name === "hello" || data.type === "hello") {
            if (!live || data.from === clientId) return;
            const mine = stateCounts(stateRef.current);
            const theirs = data.counts || { players: 0, marks: 0, heard: 0, winners: 0 };
            if (!countsCover(mine, theirs)) scheduleSnapshot();
            return;
          }
          if (data.type) ingest(data, { live: live && syncedRef.current });
        };

        await channel.subscribe(onMessage);
        if (cancelled) {
          await closeClient();
          return;
        }

        let next = emptyState();
        let pending = [];
        try {
          const history = await readHistory(channel);
          for (const message of history) {
            if (message.id) seenRef.current.add(message.id);
            const data = message.data || {};
            if (message.name === "snapshot" || data.type === "snapshot") {
              next = mergeSnapshot(next, data, roomCode);
              const caughtUp = foldEvent(next, { type: "catchup" }, roomCode, pending);
              next = caughtUp.state;
              pending = caughtUp.pending;
            } else if (data.type && data.type !== "hello") {
              const folded = foldEvent(next, data, roomCode, pending);
              next = folded.state;
              pending = folded.pending;
            }
          }
        } catch (historyError) {
          const reason = String(historyError?.message || historyError || "");
          if (/401|403|key|capability|unauthorized/i.test(reason)) throw historyError;
        }

        const local = await loadRoom(roomCode);
        if (local) {
          next = mergeSnapshot(next, local, roomCode);
          const caughtUp = foldEvent(next, { type: "catchup" }, roomCode, pending);
          next = caughtUp.state;
          pending = caughtUp.pending;
        }
        if (cancelled) {
          await closeClient();
          return;
        }

        pendingBingoRef.current = pending;
        commit(next);
        if (next.winners?.[clientId]) announcedRef.current = true;

        const wanted = sanitizeName(nameRef.current);
        const me = next.players.find((player) => player.id === clientId);
        if (!me) {
          if (next.players.length >= 16) {
            setConnection("error");
            setError("This table is full. Start a new code.");
            syncedRef.current = true;
            return;
          }
          publishRef.current({
            type: "join",
            id: clientId,
            name: wanted,
            order: Date.now(),
          });
        } else if (wanted && me.name !== wanted) {
          publishRef.current({ type: "rename", id: clientId, name: wanted, at: Date.now() });
        }

        await channel.presence.enter({ name: wanted });
        const members = await channel.presence.get();
        if (!cancelled) {
          const presence = {};
          for (const member of members || []) presence[member.clientId] = true;
          setOnline(presence);
        }
        channel.presence.subscribe(async () => {
          try {
            const latest = await channel.presence.get();
            const presence = {};
            for (const member of latest || []) presence[member.clientId] = true;
            if (!cancelled) setOnline(presence);
          } catch {
            /* presence will refresh on the next event */
          }
        });

        if (cancelled) {
          await closeClient();
          return;
        }
        syncedRef.current = true;
        ready = true;
        for (const message of buffer) applyMessage(message, true);
        setConnection("live");
        publishOwnBingo();
        channel.publish("hello", {
          type: "hello",
          from: clientId,
          counts: stateCounts(stateRef.current),
        }).catch(() => {});
        flushRef.current();

        client.connection.on("disconnected", () => {
          if (!cancelled) setConnection("connecting");
        });
        client.connection.on("suspended", () => {
          if (!cancelled) setConnection("connecting");
        });
        client.connection.on("connected", () => {
          if (cancelled || !syncedRef.current) return;
          setConnection("live");
          channel.publish("hello", {
            type: "hello",
            from: clientId,
            counts: stateCounts(stateRef.current),
          }).catch(() => {});
          flushRef.current();
        });
        client.connection.on("failed", (change) => {
          if (cancelled) return;
          setConnection("error");
          setError(change?.reason?.message || "Couldn't connect to Ably.");
        });
      } catch (err) {
        if (cancelled) return;
        setConnection("error");
        setError(err?.message || "Couldn't connect to the table.");
      }
    })();

    return () => {
      cancelled = true;
      syncedRef.current = false;
      closeClient();
    };
  }, [ablyKey, attempt, clientId, commit, ingest, ingestSnapshot, preview, publishOwnBingo, roomCode, scheduleSnapshot]);

  const players = useMemo(
    () => state.players.map((player, seat) => ({
      ...player,
      seat,
      online: preview ? true : Boolean(online[player.id]),
    })),
    [online, preview, state.players],
  );

  const me = players.find((player) => player.id === clientId) || {
    id: clientId,
    name: sanitizeName(name) || "Friend",
    seat: -1,
    online: true,
  };

  const card = useMemo(() => buildCard(roomCode, clientId), [clientId, roomCode]);

  const winners = useMemo(
    () => Object.entries(state.winners || {})
      .map(([id, win]) => ({ id, name: win.name, at: win.at || 0 }))
      .sort((a, b) => a.at - b.at || a.name.localeCompare(b.name)),
    [state.winners],
  );

  const markCell = useCallback((cell, giverId) => {
    if (me.seat < 0 || (!preview && connection !== "live")) return;
    if (giverId && giverId === clientId) return;
    publish({
      type: "mark",
      playerId: clientId,
      cell,
      prompt: card[cell],
      giverId: giverId || null,
      at: Date.now(),
    });
  }, [card, clientId, connection, me.seat, preview, publish]);

  const hearKeyword = useCallback((targetId) => {
    if (!preview && connection !== "live") return;
    const hunterSeat = stateRef.current.players.findIndex((player) => player.id === clientId);
    const targetSeat = stateRef.current.players.findIndex((player) => player.id === targetId);
    if (hunterSeat < 0 || targetSeat < 0) return;
    if (stateRef.current.heard?.[clientId]?.[targetId]) return;
    publish({
      type: "keyword",
      hunterId: clientId,
      targetId,
      word: wordFor(roomCode, hunterSeat, targetSeat),
      at: Date.now(),
    });
  }, [clientId, connection, preview, publish, roomCode]);

  const previewIncoming = useCallback(() => {
    const playersNow = stateRef.current.players;
    const hunter = playersNow.find((player) => player.id !== clientId);
    const targetSeat = playersNow.findIndex((player) => player.id === clientId);
    const hunterSeat = playersNow.findIndex((player) => player.id === hunter?.id);
    if (!hunter || hunterSeat < 0 || targetSeat < 0) return;
    publish({
      type: "keyword",
      hunterId: hunter.id,
      targetId: clientId,
      word: wordFor(roomCode, hunterSeat, targetSeat),
      at: Date.now(),
    });
  }, [clientId, publish, roomCode]);

  const previewWin = useCallback(() => {
    pushNotice({ id: `sample-win-${Date.now()}`, kind: "bingo", name: "Jordan" });
  }, [pushNotice]);

  const resetPractice = useCallback(() => {
    if (!preview) return;
    announcedRef.current = false;
    pendingBingoRef.current = [];
    toastedRef.current = new Set();
    setNotices([]);
    const next = practiceState(clientId, nameRef.current);
    commit(next);
  }, [clientId, commit, preview]);

  return {
    roomCode,
    connection,
    error,
    players,
    me,
    card,
    marks: state.marks?.[clientId] || {},
    heard: state.heard || {},
    winners,
    notices,
    dismissNotice,
    markCell,
    hearKeyword,
    previewIncoming,
    previewWin,
    resetPractice,
    retry: () => setAttempt((value) => value + 1),
  };
}
