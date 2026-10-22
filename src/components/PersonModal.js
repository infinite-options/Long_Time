import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { displayName } from "../logic";
import { colors, fonts, initials, colorForSeat } from "../theme";

export function PersonModal({ visible, prompt, players, meId, markedId, onPick, onClear, onClose }) {
  const ordered = [...players].sort((a, b) => {
    if (a.id === meId) return -1;
    if (b.id === meId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.kicker}>Who has this?</Text>
          <Text style={styles.prompt}>{prompt}</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {ordered.map((player) => {
              const selected = player.id === markedId;
              const label = player.id === meId ? `${player.name} (you)` : displayName(player, players);
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
  list: { flexGrow: 0, maxHeight: 320 },
  listContent: { paddingBottom: 8 },
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
