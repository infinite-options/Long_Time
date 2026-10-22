import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";

function BingoBanner({ notice, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notice.id), 9000);
    return () => clearTimeout(timer);
  }, [notice.id, onDismiss]);

  return (
    <View style={styles.banner}>
      <View style={styles.bannerCopy}>
        <Text style={styles.bannerKicker}>Winner</Text>
        <Text style={styles.bannerText}>{notice.name} has Bingo!</Text>
      </View>
      <Pressable onPress={() => onDismiss(notice.id)} hitSlop={8}>
        <Text style={styles.dismiss}>Close</Text>
      </Pressable>
    </View>
  );
}

export function Notices({ notices, onDismiss }) {
  const modal = notices.find((notice) => notice.kind === "keyword" || notice.kind === "self-bingo");
  const banners = notices.filter((notice) => notice.kind === "bingo");

  return (
    <View pointerEvents="box-none" style={styles.host}>
      <View pointerEvents="box-none" style={styles.banners}>
        {banners.map((notice) => (
          <BingoBanner key={notice.id} notice={notice} onDismiss={onDismiss} />
        ))}
      </View>
      <Modal visible={Boolean(modal)} transparent animationType="fade" onRequestClose={() => modal && onDismiss(modal.id)}>
        <View style={styles.backdrop}>
          {modal?.kind === "keyword" ? (
            <View style={styles.popup}>
              <Text style={styles.kicker}>They said it</Text>
              <Text style={styles.sentence}>
                {modal.hunterName} just got you to say {String(modal.word || "").toUpperCase()}!
              </Text>
              <Pressable onPress={() => onDismiss(modal.id)} style={styles.button}>
                <Text style={styles.buttonText}>Okay</Text>
              </Pressable>
            </View>
          ) : null}
          {modal?.kind === "self-bingo" ? (
            <View style={styles.popup}>
              <Text style={styles.kicker}>Bingo</Text>
              <Text style={styles.sentence}>You have Bingo!</Text>
              <Text style={styles.sub}>{modal.name} is being announced to the rest of the table.</Text>
              <Pressable onPress={() => onDismiss(modal.id)} style={styles.button}>
                <Text style={styles.buttonText}>Lovely</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { width: "100%" },
  banners: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  banner: {
    width: "100%",
    maxWidth: 640,
    backgroundColor: colors.mossDeep,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerCopy: { flex: 1 },
  bannerKicker: {
    fontFamily: fonts.bold,
    color: "#D7EBDD",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  bannerText: { fontFamily: fonts.display, color: colors.white, fontSize: 22, lineHeight: 26 },
  dismiss: { fontFamily: fonts.semibold, color: "#D7EBDD", fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 11, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  popup: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: colors.paperRaised,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
  },
  kicker: {
    fontFamily: fonts.bold,
    color: colors.gold,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontSize: 12,
  },
  sentence: {
    fontFamily: fonts.displayItalic,
    color: colors.ink,
    fontSize: 32,
    lineHeight: 38,
    marginTop: 10,
  },
  sub: {
    fontFamily: fonts.body,
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
  },
  button: {
    marginTop: 18,
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { fontFamily: fonts.bold, color: colors.paper, fontSize: 15 },
});
