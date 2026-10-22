import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  applyEvent,
  buildCard,
  countsCover,
  emptyState,
  hasBingo,
  hashString,
  mergeSnapshot,
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

  const announceFrom = useCallback((previous, next) => {
    for (const [hunterId, targets] of Object.entries(next.heard || {})) {
      const hit = targets?.[clientId];
      if (!hit || previous.heard?.[hunterId]?.[clientId]) continue;
      const hunter = next.players.find((player) => player.id === hunterId);
      pushNotice({
        id: `kw-${hunterId}-${clientId}`,
        kind: "keyword",
        hunterName: hunter?.name || "Someone",
        word: hit.word,
      });
    }
    for (const [playerId, win] of Object.entries(next.winners || {})) {
      if (previous.winners?.[playerId]) continue;
      pushNotice({
        id: `bingo-${playerId}`,
        kind: playerId === clientId ? "self-bingo" : "bingo",
        name: win.name,
      });
    }
  }, [clientId, pushNotice]);

  const maybeAnnounceBingo = useCallback((next) => {
    if (!preview && !syncedRef.current) return;
    if (next.winners?.[clientId]) {
      announcedRef.current = true;
      return;
    }
    if (announcedRef.current) return;
    if (!hasBingo(next.marks?.[clientId])) return;
    const me = next.players.find((player) => player.id === clientId);
    if (!me) return;
    announcedRef.current = true;
    publishRef.current({
      type: "bingo",
      playerId: clientId,
      name: me.name,
      at: Date.now(),
    });
  }, [clientId, preview]);

  const ingest = useCallback((event, { live }) => {
    const previous = stateRef.current;
    const { state: next, accepted } = applyEvent(previous, event, roomCode);
    if (accepted) commit(next);
    if (live && accepted) announceFrom(previous, accepted ? next : previous);
    if (accepted && (event.type === "mark" || event.type === "bingo")) maybeAnnounceBingo(next);
    return accepted;
  }, [announceFrom, commit, maybeAnnounceBingo, roomCode]);

  const ingestSnapshot = useCallback((snapshot, { live }) => {
    const previous = stateRef.current;
    const next = mergeSnapshot(previous, snapshot, roomCode);
    commit(next);
    peerCountsRef.current = stateCounts({
      players: snapshot.players || [],
      marks: snapshot.marks || {},
      heard: snapshot.heard || {},
      winners: snapshot.winners || {},
    });
    if (live) announceFrom(previous, next);
    maybeAnnounceBingo(next);
  }, [announceFrom, commit, maybeAnnounceBingo, roomCode]);

  const publishRef = useRef(() => false);
  const flushRef = useRef(async () => {});

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
    if (!accepted || preview) return accepted;
    outboxRef.current.push(event);
    flushRef.current();
    return accepted;
  }, [ingest, preview]);

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
        maybeAnnounceBingo(next);
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
        try {
          const history = await readHistory(channel);
          for (const message of history) {
            if (message.id) seenRef.current.add(message.id);
            const data = message.data || {};
            if (message.name === "snapshot" || data.type === "snapshot") {
              next = mergeSnapshot(next, data, roomCode);
            } else if (data.type && data.type !== "hello") {
              next = applyEvent(next, data, roomCode).state;
            }
          }
        } catch (historyError) {
          const reason = String(historyError?.message || historyError || "");
          if (/401|403|key|capability|unauthorized/i.test(reason)) throw historyError;
        }

        const local = await loadRoom(roomCode);
        if (local) next = mergeSnapshot(next, local, roomCode);
        if (cancelled) {
          await closeClient();
          return;
        }

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
        maybeAnnounceBingo(stateRef.current);
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
  }, [ablyKey, attempt, clientId, commit, ingest, ingestSnapshot, maybeAnnounceBingo, preview, roomCode, scheduleSnapshot]);

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
