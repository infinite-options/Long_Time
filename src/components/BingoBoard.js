import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { displayName } from "../logic";
import { colorForSeat, colors, fonts, wash } from "../theme";

function shortPrompt(prompt) {
  return String(prompt || "").replace(/\.$/, "");
}

export function BingoBoard({ card, marks, players, winning, onPressCell }) {
  const { width } = useWindowDimensions();
  const compact = width < 420;

  return (
    <View style={styles.grid}>
      {card.map((prompt, index) => {
        const mark = marks?.[index] || marks?.[String(index)];
        const filled = Boolean(mark?.giverId && !mark.cleared);
        const giver = filled ? players.find((player) => player.id === mark.giverId) : null;
        const giverName = giver ? displayName(giver, players) : mark?.giverName;
        const tint = giver ? colorForSeat(giver.seat) : colors.rust;
        const won = winning.has(index);
        return (
          <Pressable
            key={`${index}-${prompt}`}
            accessibilityRole="button"
            accessibilityLabel={shortPrompt(prompt)}
            onPress={() => onPressCell(index)}
            style={({ pressed }) => [
              styles.cell,
              compact && styles.cellCompact,
              filled && !won && { backgroundColor: wash(tint) },
              won && styles.won,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.prompt, compact && styles.promptCompact]} numberOfLines={6}>
              {shortPrompt(prompt)}
            </Text>
            {filled ? (
              <Text style={[styles.giver, { color: tint }]} numberOfLines={1}>
                {giverName}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.rule,
    backgroundColor: colors.paperRaised,
  },
  cell: {
    width: "20%",
    minHeight: 112,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: 5,
    paddingVertical: 6,
    justifyContent: "space-between",
  },
  cellCompact: { minHeight: 96, paddingHorizontal: 3 },
  prompt: {
    fontFamily: fonts.medium,
    color: colors.ink,
    fontSize: 12,
    lineHeight: 15,
  },
  promptCompact: { fontSize: 10, lineHeight: 12 },
  giver: {
    fontFamily: fonts.bold,
    fontSize: 11,
    marginTop: 4,
  },
  won: {
    backgroundColor: "#F6E7C4",
  },
  pressed: { backgroundColor: "#EFE4D6" },
});
