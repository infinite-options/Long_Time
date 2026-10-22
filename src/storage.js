import AsyncStorage from "@react-native-async-storage/async-storage";

const CLIENT_KEY = "ltnss.clientId";
const SESSION_KEY = "ltnss.session";
const NAME_KEY = "ltnss.name";

function roomKey(code) {
  return `ltnss.room.${String(code || "").toUpperCase()}`;
}

function createId() {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function getClientId() {
  const existing = await AsyncStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const created = createId();
  await AsyncStorage.setItem(CLIENT_KEY, created);
  return created;
}

export async function loadSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.name) return null;
    return session;
  } catch {
    return null;
  }
}

export async function saveSession(session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function loadName() {
  return (await AsyncStorage.getItem(NAME_KEY)) || "";
}

export async function rememberName(name) {
  const clean = String(name || "").trim();
  if (clean) await AsyncStorage.setItem(NAME_KEY, clean);
}

export async function loadRoom(code) {
  try {
    const raw = await AsyncStorage.getItem(roomKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.players)) return null;
    return {
      players: parsed.players,
      marks: parsed.marks || {},
      heard: parsed.heard || {},
      winners: parsed.winners || {},
    };
  } catch {
    return null;
  }
}

export async function saveRoom(code, state) {
  const payload = {
    players: state.players || [],
    marks: state.marks || {},
    heard: state.heard || {},
    winners: state.winners || {},
  };
  await AsyncStorage.setItem(roomKey(code), JSON.stringify(payload));
}
