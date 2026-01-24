import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useStitchTheme } from "./theme";

type ReviewCardUIProps = {
  title?: string;
  index: number;
  total: number;
  progress: number; // 0..1
  tag?: string;
  deckTitle?: string;
  question: string;
  answer: string;
  sourceText?: string;
  revealed: boolean;

  onReveal?: () => void;
  onEdit?: () => void;
  onClose: () => void;
  onAgain: () => void;
  onHard: () => void;
  onGood: () => void;
  onEasy: () => void;
};

export function ReviewCardUI({
  title = "Revision",
  index,
  total,
  progress,
  tag,
  deckTitle,
  question,
  answer,
  sourceText,
  revealed,
  onReveal,
  onEdit,
  onClose,
  onAgain,
  onHard,
  onGood,
  onEasy,
}: ReviewCardUIProps) {
  const t = useStitchTheme();
  const insets = useSafeAreaInsets();

  // Flip state
  const flip = useRef(new Animated.Value(0)).current; // 0=front, 1=back
  const isAnimating = useRef(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasFlippedOnce, setHasFlippedOnce] = useState(false);

  // Reset for every new card.
  useEffect(() => {
    isAnimating.current = false;
    flip.stopAnimation();
    flip.setValue(0);
    setIsFlipped(false);
    setHasFlippedOnce(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // If parent forces "revealed=false" on the current card, align UI.
  useEffect(() => {
    if (!revealed) {
      isAnimating.current = false;
      flip.stopAnimation();
      flip.setValue(0);
      setIsFlipped(false);
      setHasFlippedOnce(false);
    }
  }, [revealed, flip]);

  const pct = Math.max(0, Math.min(1, progress));
  const ALPHA_BG = 0.12;
  const ALPHA_BORDER = 0.18;
  const ALPHA_SUB = t.dark ? 0.65 : 0.6;

  const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;

  const tone = {
    again: {
      bg: rgba(239, 68, 68, ALPHA_BG),
      border: rgba(239, 68, 68, ALPHA_BORDER),
      text: t.dark ? "#fecaca" : "#dc2626",
      sub: t.dark ? rgba(254, 202, 202, ALPHA_SUB) : rgba(220, 38, 38, ALPHA_SUB),
    },
    hard: {
      bg: rgba(249, 115, 22, ALPHA_BG),
      border: rgba(249, 115, 22, ALPHA_BORDER),
      text: t.dark ? "#fed7aa" : "#ea580c",
      sub: t.dark ? rgba(254, 215, 170, ALPHA_SUB) : rgba(234, 88, 12, ALPHA_SUB),
    },
    good: {
      bg: t.dark ? rgba(147, 197, 253, ALPHA_BG) : rgba(19, 127, 236, ALPHA_BG),
      border: t.dark ? rgba(147, 197, 253, ALPHA_BORDER) : rgba(19, 127, 236, ALPHA_BORDER),
      text: t.dark ? "#bfdbfe" : t.primary,
      sub: t.dark ? rgba(191, 219, 254, ALPHA_SUB) : rgba(19, 127, 236, ALPHA_SUB),
    },
    easy: {
      bg: rgba(16, 185, 129, ALPHA_BG),
      border: rgba(16, 185, 129, ALPHA_BORDER),
      text: t.dark ? "#a7f3d0" : "#059669",
      sub: t.dark ? rgba(167, 243, 208, ALPHA_SUB) : rgba(5, 150, 105, ALPHA_SUB),
    },
  } as const;

  const btnStyle =
    (k: keyof typeof tone) =>
    ({ pressed }: { pressed: boolean }) => [
      styles.actBtn,
      {
        backgroundColor: tone[k].bg,
        borderColor: tone[k].border,
        opacity: pressed ? 0.9 : 1,
      },
    ];

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  // Helps avoid flicker around 90deg on some devices
  const frontOpacity = flip.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flip.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

  const toggleFlip = () => {
    if (isAnimating.current) return;

    const next = isFlipped ? 0 : 1;

    // First reveal (only once per card)
    if (!hasFlippedOnce) {
      setHasFlippedOnce(true);
      onReveal?.();
    }

    isAnimating.current = true;
    Animated.timing(flip, {
      toValue: next,
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      isAnimating.current = false;
      if (finished) setIsFlipped(next === 1);
    });
  };

  // After the first flip, keep grading available even if the user flips back.
  const canGrade = hasFlippedOnce;

  const stop = (e: GestureResponderEvent) => {
    // Prevent tap on icons from also flipping the card.
    // Works on iOS/Android; on web it is a no-op.
    // @ts-ignore
    e?.stopPropagation?.();
  };

  const Header = () => (
    <View style={styles.cardTop}>
      <View style={{ flexDirection: "row", gap: 8, flex: 1, flexWrap: "wrap" }}>
        {tag ? (
          <View
            style={[
              styles.chip,
              { backgroundColor: "rgba(19,127,236,0.12)", borderColor: "rgba(19,127,236,0.25)" },
            ]}
          >
            <Text style={[styles.chipTxt, { color: t.primary, fontFamily: t.font.medium }]}>{tag}</Text>
          </View>
        ) : null}

        {deckTitle ? (
          <View
            style={[
              styles.chip,
              {
                backgroundColor: t.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                borderColor: t.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[styles.chipTxt, { color: t.muted, fontFamily: t.font.medium, maxWidth: 180 }]}
            >
              {deckTitle}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable onPress={(e) => stop(e)} style={styles.toolBtn} hitSlop={10}>
          <Ionicons name="flag-outline" size={18} color={t.muted} />
        </Pressable>

        <Pressable
          onPress={(e) => {
            stop(e);
            onEdit?.();
          }}
          disabled={!onEdit}
          style={({ pressed }) => [styles.toolBtn, { opacity: !onEdit ? 0.35 : pressed ? 0.75 : 1 }]}
          hitSlop={10}
        >
          <Ionicons name="create-outline" size={18} color={t.muted} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={["top", "left", "right"]}>
      {/* Top bar */}
      <View style={[styles.top, { paddingTop: Math.max(10, insets.top + 6) }]}>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={22} color={t.text} />
        </Pressable>

        <Text style={[styles.title, { color: t.text, fontFamily: t.font.display }]}>{title}</Text>

        <Text style={[styles.counter, { color: t.muted, fontFamily: t.font.display }]}>
          {index}/{total}
        </Text>
      </View>

      {/* progress */}
      <View style={styles.progressWrap}>
        <View style={[styles.progressBg, { backgroundColor: t.dark ? "#3b4754" : "#E5E7EB" }]}>
          <View style={[styles.progressFill, { backgroundColor: t.primary, width: `${pct * 100}%` }]} />
        </View>
      </View>

      {/* card */}
      <View style={styles.center}>
        <Pressable onPress={toggleFlip} style={{ flex: 1 }}>
          <View style={styles.flipWrap}>
            {/* FRONT = QUESTION */}
            <Animated.View
              pointerEvents={isFlipped ? "none" : "auto"}
              style={[
                styles.face,
                { opacity: frontOpacity, transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
              ]}
            >
              <View
                style={[
                  styles.cardShell,
                  { backgroundColor: t.dark ? "#1c2630" : "#fff", borderColor: t.border },
                ]}
              >
                <Header />

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.centerBlock}>
                    <Text style={[styles.q, { color: t.text, fontFamily: t.font.semibold }]}>{question}</Text>

                    <Text style={[styles.hint, { color: t.muted, fontFamily: t.font.medium }]}>
                      Toucher la carte pour la retourner
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>

            {/* BACK = REPONSE */}
            <Animated.View
              pointerEvents={isFlipped ? "auto" : "none"}
              style={[
                styles.face,
                { opacity: backOpacity, transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
              ]}
            >
              <View
                style={[
                  styles.cardShell,
                  { backgroundColor: t.dark ? "#1c2630" : "#fff", borderColor: t.border },
                ]}
              >
                <Header />

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.centerBlock}>
                    <Text style={[styles.answerLabel, { color: t.muted, fontFamily: t.font.semibold }]}>Réponse</Text>

                    <Text style={[styles.a, { color: t.dark ? "#E6EDF5" : "#334155", fontFamily: t.font.body }]}>
                      {answer}
                    </Text>

                    {sourceText ? (
                      <Text style={[styles.src, { color: t.muted, fontFamily: t.font.body }]}>{sourceText}</Text>
                    ) : null}

                    <Text style={[styles.hint, { color: t.muted, fontFamily: t.font.medium }]}>
                      Toucher la carte pour revenir
                    </Text>
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </View>
        </Pressable>
      </View>

      {/* actions */}
      <View style={[styles.actions, { backgroundColor: t.bg, paddingBottom: insets.bottom + 14 }]}>
        {canGrade ? (
          <View style={styles.grid}>
            <Pressable onPress={onAgain} style={btnStyle("again")}>
              <Text style={[styles.actTxt, { color: tone.again.text, fontFamily: t.font.display }]}>A revoir</Text>
              <Text style={[styles.actSub, { color: tone.again.sub, fontFamily: t.font.medium }]}>&lt;1m</Text>
            </Pressable>

            <Pressable onPress={onHard} style={btnStyle("hard")}>
              <Text style={[styles.actTxt, { color: tone.hard.text, fontFamily: t.font.display }]}>Difficile</Text>
              <Text style={[styles.actSub, { color: tone.hard.sub, fontFamily: t.font.medium }]}>2d</Text>
            </Pressable>

            <Pressable onPress={onGood} style={btnStyle("good")}>
              <Text style={[styles.actTxt, { color: tone.good.text, fontFamily: t.font.display }]}>Bien</Text>
              <Text style={[styles.actSub, { color: tone.good.sub, fontFamily: t.font.medium }]}>4d</Text>
            </Pressable>

            <Pressable onPress={onEasy} style={btnStyle("easy")}>
              <Text style={[styles.actTxt, { color: tone.easy.text, fontFamily: t.font.display }]}>Facile</Text>
              <Text style={[styles.actSub, { color: tone.easy.sub, fontFamily: t.font.medium }]}>7d</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ height: 64 }} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  top: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center" },
  closeBtn: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 16 },
  counter: { width: 44, textAlign: "right" },

  progressWrap: { paddingHorizontal: 24, paddingBottom: 10 },
  progressBg: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },

  center: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "flex-start" },

  flipWrap: { flex: 1 },
  face: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backfaceVisibility: "hidden",
  },

  cardShell: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  cardTop: {
    padding: 16,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  chip: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chipTxt: { fontSize: 12 },
  toolBtn: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },

  // Center the content vertically when it is short; still scroll when it's long.
  scrollContent: {
    flexGrow: 1,
    padding: 18,
    paddingTop: 12,
    paddingBottom: 18,
    justifyContent: "center",
  },
  centerBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 6,
  },

  q: {
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  answerLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: "center",
  },
  a: {
    fontSize: 18,
    lineHeight: 26,
    textAlign: "center",
  },

  hint: {
    marginTop: 16,
    fontSize: 12,
    textAlign: "center",
  },
  src: { marginTop: 10, fontSize: 12, textAlign: "center" },

  actions: { paddingHorizontal: 16, paddingTop: 10 },
  grid: { flexDirection: "row", gap: 10 },
  actBtn: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actTxt: { fontSize: 14 },
  actSub: { fontSize: 10, marginTop: 2 },
});
