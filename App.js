import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Fraunces_700Bold, Fraunces_700Bold_Italic } from "@expo-google-fonts/fraunces";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GameScreen } from "./src/components/GameScreen";
import { JoinScreen } from "./src/components/JoinScreen";
import { ablyKey } from "./src/env";
import { clearSession, getClientId, loadName, loadSession, rememberName, saveSession } from "./src/storage";
import { colors } from "./src/theme";

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const [ready, setReady] = useState(false);
  const [clientId, setClientId] = useState("");
  const [session, setSession] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = colors.wood;
    document.body.style.margin = "0";
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [id, stored, remembered] = await Promise.all([getClientId(), loadSession(), loadName()]);
      if (cancelled) return;
      setClientId(id);
      setSavedName(remembered || stored?.name || "");
      if (stored?.preview || stored?.code) setSession(stored);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  let screen = <View style={{ flex: 1, backgroundColor: colors.wood }} />;
  const fontsReady = fontsLoaded || Boolean(fontError);
  if (fontsReady && ready && !session) {
    screen = (
      <JoinScreen
        initialName={savedName}
        initialCode=""
        error={joinError}
        needsKey={!ablyKey()}
        onJoin={async (name, code) => {
          if (!ablyKey()) {
            setJoinError("Add EXPO_PUBLIC_ABLY_API_KEY to .env and restart Expo before joining a live table.");
            return;
          }
          const next = { name, code, preview: false };
          await rememberName(name);
          await saveSession(next);
          setJoinError("");
          setSession(next);
        }}
        onPractice={async (name) => {
          const next = { name, code: "PRACTICE", preview: true };
          await rememberName(name);
          await saveSession(next);
          setJoinError("");
          setSession(next);
        }}
      />
    );
  } else if (fontsReady && ready && session) {
    screen = (
      <GameScreen
        session={session}
        clientId={clientId}
        ablyKey={ablyKey()}
        onLeave={async () => {
          await clearSession();
          setSession(null);
        }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen}
    </SafeAreaProvider>
  );
}
