import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { conflictingCells, displayName, winningCells, wordFor } from "../logic";
import { colors, fonts } from "../theme";
import { useGame } from "../useGame";
import { BingoBoard } from "./BingoBoard";
import { KeywordList } from "./KeywordList";
import { Notices } from "./Notices";
import { MoveConfirm, PersonModal } from "./PersonModal";

export function GameScreen({ session, clientId, ablyKey, onLeave }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("bingo");
  const [activeCell, setActiveCell] = useState(null);
  const [move, setMove] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const game = useGame({
    code: session.code,
    name: session.name,
    clientId,
    preview: Boolean(session.preview),
    ablyKey,
  });

  const winning = winningCells(game.marks);
  const markedCount = Object.values(game.marks).filter((mark) => mark?.giverId && !mark.cleared).length;
  const keywords = game.players
    .filter((player) => player.id !== game.me.id)
    .map((player) => ({
      ...player,
      label: displayName(player, game.players),
      word: game.me.seat >= 0 ? wordFor(game.roomCode, game.me.seat, player.seat) : "",
      done: Boolean(game.heard?.[game.me.id]?.[player.id]),
    }));

  const activePrompt = activeCell == null ? "" : game.card[activeCell];
  const activeMark = activeCell == null ? null : game.marks[activeCell] || game.marks[String(activeCell)];
  const statusColor = game.connection === "live" ? "#8FCB9F" : game.connection === "error" ? "#F0B09A" : "#E6C39A";
  const statusLabel = game.connection === "live" ? "Live" : game.connection === "error" ? "Offline" : "Connecting";

  async function copyCode() {
    await Clipboard.setStringAsync(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerTop}>
            <Text style={styles.brand}>Long time no see</Text>
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>
          <View style={styles.headerBottom}>
            <View style={styles.identity}>
              <Text style={styles.you}>{game.me.name}</Text>
              <Text style={styles.meta}>
                {session.preview
                  ? "Practice table · this phone only"
                  : `${spaced(session.code)}  ·  ${game.players.length} seated`}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {session.preview ? null : (
                <Pressable onPress={copyCode} hitSlop={6}>
                  <Text style={styles.headerLink}>{copied ? "Copied" : "Copy code"}</Text>
                </Pressable>
              )}
              {confirmLeave ? (
                <View style={styles.confirm}>
                  <Pressable onPress={onLeave} hitSlop={6}>
                    <Text style={styles.leaveYes}>Leave</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmLeave(false)} hitSlop={6}>
                    <Text style={styles.headerLink}>Stay</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={() => setConfirmLeave(true)} hitSlop={6}>
                  <Text style={styles.headerLink}>Leave</Text>
                </Pressable>
              )}
            </View>
          </View>
          {game.error ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{game.error}</Text>
              {session.preview ? null : (
                <Pressable onPress={game.retry}>
                  <Text style={styles.headerLink}>Retry</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sheet}>
        <Notices notices={game.notices} onDismiss={game.dismissNotice} />
        {game.winners.length > 0 ? (
          <View style={styles.winners}>
            <Text style={styles.winnersKicker}>Bingo</Text>
            <Text style={styles.winnersNames}>{game.winners.map((winner) => winner.name).join("   ·   ")}</Text>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {[
            ["bingo", "Bingo"],
            ["keywords", "Keywords"],
          ].map(([id, label]) => {
            const selected = tab === id;
            return (
              <Pressable key={id} onPress={() => setTab(id)} style={styles.tab}>
                <Text style={[styles.tabText, selected && styles.tabTextOn]}>{label}</Text>
                <View style={[styles.tabRule, selected && styles.tabRuleOn]} />
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "bingo" ? (
            <View>
              <Text style={styles.sectionLead}>
                Tap a square, then choose who claimed it. {markedCount} of 25 marked.
              </Text>
              <BingoBoard
                card={game.card}
                marks={game.marks}
                players={game.players}
                winning={winning}
                onPressCell={setActiveCell}
              />
              <Text style={styles.footnote}>Five in a row, column, or either diagonal.</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionLead}>
                A different word for each person. No two words at this table are the same.
              </Text>
              <KeywordList keywords={keywords} onHeard={game.hearKeyword} />
              {session.preview ? (
                <View style={styles.practice}>
                  <Pressable onPress={game.previewIncoming}>
                    <Text style={styles.practiceLink}>Preview the popup someone else would see</Text>
                  </Pressable>
                  <Pressable onPress={game.previewWin}>
                    <Text style={styles.practiceLink}>Preview a Bingo announcement</Text>
                  </Pressable>
                  <Pressable onPress={game.resetPractice}>
                    <Text style={styles.practiceLink}>Reset this practice table</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>

      <PersonModal
        visible={activeCell != null && !move}
        prompt={activePrompt}
        players={game.players}
        meId={game.me.id}
        markedId={activeMark?.cleared ? null : activeMark?.giverId}
        onPick={(giverId) => {
          const conflicts = conflictingCells(game.marks, activeCell, giverId);
          if (conflicts.length) {
            const person = game.players.find((player) => player.id === giverId);
            setMove({
              giverId,
              cell: activeCell,
              name: person ? displayName(person, game.players) : "them",
              answers: conflicts.map((index) => plainPrompt(game.card[index])),
              cells: conflicts,
            });
            return;
          }
          game.markCell(activeCell, giverId);
          setActiveCell(null);
        }}
        onClear={() => {
          game.markCell(activeCell, null);
          setActiveCell(null);
        }}
        onClose={() => setActiveCell(null)}
      />
      <MoveConfirm
        visible={Boolean(move)}
        name={move?.name}
        answers={move?.answers || []}
        onYes={() => {
          for (const cell of move.cells) game.markCell(cell, null);
          game.markCell(move.cell, move.giverId);
          setMove(null);
          setActiveCell(null);
        }}
        onNo={() => setMove(null)}
      />
    </View>
  );
}

function spaced(code) {
  return String(code || "").split("").join(" ");
}

function plainPrompt(prompt) {
  return String(prompt || "").replace(/\.$/, "");
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.wood },
  header: { backgroundColor: colors.wood },
  headerInner: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { fontFamily: fonts.displayItalic, color: colors.paper, fontSize: 22 },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: fonts.semibold, color: "#E6D9CC", fontSize: 12, letterSpacing: 0.4 },
  headerBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10, gap: 12 },
  identity: { flex: 1 },
  you: { fontFamily: fonts.bold, color: colors.paper, fontSize: 20 },
  meta: { fontFamily: fonts.medium, color: "#D9CBBE", fontSize: 13, marginTop: 2, letterSpacing: 0.6 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerLink: { fontFamily: fonts.semibold, color: "#F0C7A2", fontSize: 14 },
  confirm: { flexDirection: "row", gap: 12 },
  leaveYes: { fontFamily: fonts.bold, color: "#F3B7A4", fontSize: 14 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  errorText: { flex: 1, fontFamily: fonts.medium, color: "#F3B7A4", fontSize: 13, lineHeight: 18 },
  sheet: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  winners: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 4,
  },
  winnersKicker: {
    fontFamily: fonts.bold,
    color: colors.moss,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  winnersNames: { fontFamily: fonts.display, color: colors.ink, fontSize: 22, marginTop: 2 },
  tabs: { flexDirection: "row", paddingHorizontal: 18, gap: 22, marginTop: 8 },
  tab: { paddingTop: 12 },
  tabText: { fontFamily: fonts.semibold, color: colors.inkSoft, fontSize: 16 },
  tabTextOn: { color: colors.ink },
  tabRule: { height: 2, marginTop: 8, backgroundColor: "transparent" },
  tabRuleOn: { backgroundColor: colors.rust },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 14 },
  sectionLead: {
    fontFamily: fonts.body,
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footnote: {
    fontFamily: fonts.medium,
    color: colors.inkSoft,
    fontSize: 13,
    marginTop: 12,
  },
  practice: { marginTop: 18, gap: 10 },
  practiceLink: { fontFamily: fonts.semibold, color: colors.rustDeep, fontSize: 14 },
});
