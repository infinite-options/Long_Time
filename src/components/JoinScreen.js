import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isValidCode, makeCode, sanitizeCode, sanitizeName } from "../logic";
import { colors, fonts } from "../theme";

export function JoinScreen({ initialName, initialCode, error, needsKey, onJoin, onPractice }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName || "");
  const [code, setCode] = useState(sanitizeCode(initialCode || ""));
  const [localError, setLocalError] = useState("");

  const cleanName = sanitizeName(name);
  const cleanCode = sanitizeCode(code);
  const canJoin = cleanName.length > 0 && isValidCode(cleanCode);

  function join() {
    if (!cleanName) {
      setLocalError("Add the name everyone will recognize.");
      return;
    }
    if (!isValidCode(cleanCode)) {
      setLocalError("The table code is 6 letters or numbers.");
      return;
    }
    setLocalError("");
    onJoin(cleanName, cleanCode);
  }

  return (
    <View style={styles.page}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sheet}>
            <Text style={styles.kicker}>A reunion game</Text>
            <Text style={styles.title}>Long time</Text>
            <Text style={styles.titleItalic}>no see.</Text>
            <Text style={styles.lede}>
              Two games, one table. Slip a word into the conversation, then see who can fill a bingo line first.
            </Text>

            <Text style={styles.label}>Your name</Text>
            <TextInput
              value={name}
              onChangeText={(value) => {
                setName(value);
                setLocalError("");
              }}
              placeholder="Alex"
              placeholderTextColor="#B3A79C"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={24}
              style={styles.input}
              returnKeyType="next"
            />

            <View style={styles.codeHeader}>
              <Text style={styles.label}>Table code</Text>
              <Pressable
                onPress={() => {
                  setCode(makeCode());
                  setLocalError("");
                }}
                hitSlop={8}
              >
                <Text style={styles.link}>New code</Text>
              </Pressable>
            </View>
            <TextInput
              value={cleanCode}
              onChangeText={(value) => {
                setCode(sanitizeCode(value));
                setLocalError("");
              }}
              placeholder=""
              placeholderTextColor="#B3A79C"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              style={[styles.input, styles.codeInput]}
              returnKeyType="go"
              onSubmitEditing={join}
            />
            <Text style={styles.hint}>Six letters or numbers. Everyone at the reunion uses the same code.</Text>

            {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={join}
              disabled={!canJoin}
              style={({ pressed }) => [
                styles.primary,
                !canJoin && styles.disabled,
                pressed && canJoin && styles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>Take your seat</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => onPractice(cleanName || "Alex")}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressedSoft]}
            >
              <Text style={styles.secondaryText}>Practice on this phone</Text>
            </Pressable>

            <View style={styles.rules}>
              <Text style={styles.ruleTitle}>Keywords</Text>
              <Text style={styles.ruleBody}>You get a different word for each person. When they say it, mark it. Their phone tells them what happened.</Text>
              <Text style={[styles.ruleTitle, styles.ruleGap]}>Bingo</Text>
              <Text style={styles.ruleBody}>Twenty-five of the thirty stories, shuffled into a different board for every player. Five in a row, column, or diagonal wins the table.</Text>
            </View>

            {needsKey ? (
              <Text style={styles.keyNote}>
                Live tables need an Ably key in .env. Practice works without one.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.wood },
  flex: { flex: 1 },
  content: { flexGrow: 1, alignItems: "center", paddingHorizontal: 16 },
  sheet: { width: "100%", maxWidth: 560 },
  kicker: {
    fontFamily: fonts.semibold,
    color: colors.gold,
    letterSpacing: 2.4,
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.paper,
    fontSize: 64,
    lineHeight: 64,
  },
  titleItalic: {
    fontFamily: fonts.displayItalic,
    color: colors.paper,
    fontSize: 64,
    lineHeight: 68,
    marginBottom: 16,
  },
  lede: {
    fontFamily: fonts.body,
    color: "#E6D9CC",
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 460,
    marginBottom: 28,
  },
  label: {
    fontFamily: fonts.semibold,
    color: colors.paper,
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  codeHeader: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    fontFamily: fonts.semibold,
    color: "#F0C7A2",
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 18,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  codeInput: {
    fontFamily: fonts.display,
    fontSize: 28,
    letterSpacing: 6,
    textAlign: "center",
  },
  hint: {
    fontFamily: fonts.body,
    color: "#CDBFAF",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  error: {
    fontFamily: fonts.semibold,
    color: "#F0C7A2",
    fontSize: 14,
    marginTop: 14,
  },
  primary: {
    marginTop: 22,
    backgroundColor: colors.rust,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryText: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 17,
  },
  secondary: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6B5346",
  },
  secondaryText: {
    fontFamily: fonts.semibold,
    color: colors.paper,
    fontSize: 15,
  },
  disabled: { opacity: 0.45 },
  pressed: { backgroundColor: colors.rustDeep },
  pressedSoft: { backgroundColor: "#3A2922" },
  rules: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: "#3D2C24",
    paddingTop: 18,
  },
  ruleTitle: {
    fontFamily: fonts.semibold,
    color: colors.paper,
    fontSize: 14,
    marginBottom: 4,
  },
  ruleGap: { marginTop: 14 },
  ruleBody: {
    fontFamily: fonts.body,
    color: "#D9CBBE",
    fontSize: 14,
    lineHeight: 20,
  },
  keyNote: {
    fontFamily: fonts.medium,
    color: "#E6C39A",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 18,
  },
});
