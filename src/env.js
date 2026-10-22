export function ablyKey() {
  const key = String(process.env.EXPO_PUBLIC_ABLY_API_KEY || "").trim();
  if (!key || /your-key|changeme|placeholder/i.test(key)) return "";
  return key;
}
