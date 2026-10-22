import { Pressable, StyleSheet, Text, View } from "react-native";
import { colorForSeat, colors, fonts, initials } from "../theme";

export function KeywordList({ keywords, onHeard }) {
  if (keywords.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>The other chairs are empty.</Text>
        <Text style={styles.emptyBody}>Share the table code. Words show up here as people sit down, one different word for each of them.</Text>
      </View>
    );
  }

  const heard = keywords.filter((item) => item.done).length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.progress}>{heard} of {keywords.length} heard</Text>
      {keywords.map((item) => {
        const tint = colorForSeat(item.seat);
        return (
          <View key={item.id} style={[styles.card, item.done && styles.cardDone]}>
            <View style={styles.top}>
              <View style={[styles.avatar, { backgroundColor: tint }]}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <View style={styles.identity}>
                <Text style={styles.name}>{item.label}</Text>
                <Text style={styles.whisper}>{item.online ? "At the table" : "Stepped away"}</Text>
              </View>
            </View>
            <Text style={styles.ask}>Get them to say</Text>
            <Text style={[styles.word, item.word.length > 12 && styles.wordLong]}>{item.word.toUpperCase()}</Text>
            {item.done ? (
              <View style={styles.donePill}>
                <Text style={styles.doneText}>Done</Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => onHeard(item.id)}
                style={({ pressed }) => [styles.heard, pressed && styles.heardPressed]}
              >
                <Text style={styles.heardText}>Heard it</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  progress: {
    fontFamily: fonts.semibold,
    color: colors.inkSoft,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.paperRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: 16,
  },
  cardDone: { backgroundColor: "#E7F0EA", borderColor: "#C9DDD1" },
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  identity: { flex: 1 },
  name: { fontFamily: fonts.bold, color: colors.ink, fontSize: 18 },
  whisper: { fontFamily: fonts.medium, color: colors.inkSoft, fontSize: 13, marginTop: 1 },
  ask: {
    marginTop: 16,
    fontFamily: fonts.semibold,
    color: colors.inkSoft,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  word: {
    fontFamily: fonts.displayItalic,
    color: colors.ink,
    fontSize: 40,
    lineHeight: 46,
    marginTop: 2,
  },
  wordLong: { fontSize: 30, lineHeight: 36 },
  heard: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heardPressed: { backgroundColor: colors.rustDeep },
  heardText: { fontFamily: fonts.bold, color: colors.paper, fontSize: 14 },
  donePill: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: colors.moss,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  doneText: {
    fontFamily: fonts.bold,
    color: colors.white,
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  empty: {
    backgroundColor: colors.paperRaised,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  emptyTitle: { fontFamily: fonts.display, color: colors.ink, fontSize: 28, lineHeight: 32 },
  emptyBody: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 15, lineHeight: 22, marginTop: 8 },
});
