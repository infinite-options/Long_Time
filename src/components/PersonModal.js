import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { displayName } from "../logic";
import { colors, fonts, initials, colorForSeat } from "../theme";

function answerList(answers) {
  const names = answers.filter(Boolean);
  if (names.length <= 1) return names[0] || "that square";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function MoveConfirm({ visible, name, answers, onYes, onNo }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNo}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.kicker}>Already on this line</Text>
          <Text style={styles.question}>
            Do you want to remove {name} from {answerList(answers)}?
          </Text>
          <View style={styles.actions}>
            <Pressable onPress={onYes} style={styles.yesButton}>
              <Text style={styles.yesText}>Yes</Text>
            </Pressable>
            <Pressable onPress={onNo} style={styles.noButton}>
              <Text style={styles.noText}>No</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PersonModal({ visible, prompt, players, meId, markedId, onPick, onClear, onClose }) {
  const choices = players
    .filter((player) => player.id !== meId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.kicker}>Who has this?</Text>
          <Text style={styles.prompt}>{prompt}</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {choices.length === 0 ? (
              <Text style={styles.empty}>Share the table code. People show up here as they sit down.</Text>
            ) : null}
            {choices.map((player) => {
              const selected = player.id === markedId;
              const label = displayName(player, players);
              return (
                <Pressable
                  key={player.id}
                  onPress={() => onPick(player.id)}
                  style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                >
                  <View style={[styles.avatar, { backgroundColor: colorForSeat(player.seat) }]}>
                    <Text style={styles.avatarText}>{initials(player.name)}</Text>
                  </View>
                  <Text style={styles.name}>{label}</Text>
                  {selected ? <Text style={styles.chosen}>Chosen</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          {markedId ? (
            <Pressable onPress={onClear} style={styles.clear}>
              <Text style={styles.clearText}>Clear this square</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 11, 0.62)",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "86%",
    backgroundColor: colors.paperRaised,
    borderRadius: 22,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  kicker: {
    fontFamily: fonts.semibold,
    color: colors.gold,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontSize: 12,
  },
  prompt: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 26,
    lineHeight: 32,
    marginTop: 8,
    marginBottom: 14,
  },
  question: {
    fontFamily: fonts.body,
    color: colors.ink,
    fontSize: 22,
    lineHeight: 30,
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  yesButton: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  yesText: { fontFamily: fonts.bold, color: colors.paper, fontSize: 15 },
  noButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  noText: { fontFamily: fonts.semibold, color: colors.inkSoft, fontSize: 15 },
  list: { flexGrow: 0, maxHeight: 320 },
  listContent: { paddingBottom: 8 },
  empty: {
    fontFamily: fonts.body,
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  rowSelected: { backgroundColor: "#F3E2D4" },
  rowPressed: { backgroundColor: "#EFE6DA" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
  name: { flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 },
  chosen: { fontFamily: fonts.semibold, color: colors.rust, fontSize: 13 },
  clear: { paddingVertical: 12, alignItems: "center" },
  clearText: { fontFamily: fonts.semibold, color: colors.rustDeep, fontSize: 15 },
  close: { paddingVertical: 8, alignItems: "center" },
  closeText: { fontFamily: fonts.medium, color: colors.inkSoft, fontSize: 15 },
});
