import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useAppStore } from "../../src/store/useAppStore";
import { useStitchTheme } from "../../src/uiStitch/theme";

const { width } = Dimensions.get("window");

type Slide = {
  title: string;
  titleHighlight?: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
};

const SLIDES: Slide[] = [
  {
    title: "Retiens plus en",
    titleHighlight: "moins de temps",
    description: "Maîtrise des sujets complexes avec notre moteur de répétition espacée adapté aux étudiants en médecine.",
    icon: "flash",
    iconColor: "#f59e0b",
    iconBg: "rgba(245, 158, 11, 0.15)",
  },
  {
    title: "Flashcards",
    titleHighlight: "Intelligentes",
    description: "Un algorithme qui s'adapte à ton rythme pour maximiser ta rétention et minimiser ton temps d'étude.",
    icon: "sparkles",
    iconColor: "#8b5cf6",
    iconBg: "rgba(139, 92, 246, 0.15)",
  },
  {
    title: "Étudie",
    titleHighlight: "Partout",
    description: "Synchronisation automatique sur tous tes appareils. Transforme tes temps morts en sessions productives.",
    icon: "sync",
    iconColor: "#06b6d4",
    iconBg: "rgba(6, 182, 212, 0.15)",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const { setOnboardingDone } = useAppStore();
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    setCurrentIndex(index);
  };

  const handleCreateAccount = async () => {
    await setOnboardingDone(true);
    router.push("/auth/signup");
  };

  const handleLogin = async () => {
    await setOnboardingDone(true);
    router.push("/auth/login");
  };

  const handleSkip = async () => {
    await setOnboardingDone(true);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Background glow effect */}
      <LinearGradient
        colors={t.dark ? ["rgba(19,127,236,0.15)", "transparent"] : ["rgba(19,127,236,0.1)", "transparent"]}
        style={styles.backgroundGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      <View style={styles.container}>
        {/* Logo Header */}
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: t.dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)", borderColor: t.border }]}>
            <Image 
              source={require("../../assets/images/medflash-logo.png")} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.logoText, { color: t.text, fontFamily: t.font.display }]}>
              CliniCard
            </Text>
          </View>
        </View>

        {/* Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.carousel}
        >
          {SLIDES.map((slide, index) => (
            <View key={index} style={[styles.slide, { width }]}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: slide.iconBg }]}>
                <Ionicons name={slide.icon} size={80} color={slide.iconColor} />
              </View>

              {/* Text Content */}
              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: t.text, fontFamily: t.font.display }]}>
                  {slide.title}
                  {slide.titleHighlight && (
                    <>
                      {"\n"}
                      <Text style={{ color: t.primary }}>{slide.titleHighlight}</Text>
                    </>
                  )}
                </Text>
                <Text style={[styles.description, { color: t.muted, fontFamily: t.font.body }]}>
                  {slide.description}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Page Indicators */}
        <View style={styles.indicatorsContainer}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor: currentIndex === index ? t.primary : (t.dark ? "#334155" : "#cbd5e1"),
                  width: currentIndex === index ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Pressable
            onPress={handleCreateAccount}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.primaryButtonText, { fontFamily: t.font.display }]}>
              Créer un compte gratuit
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>

          <Pressable
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: t.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: t.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: t.text, fontFamily: t.font.display }]}>
              J'ai déjà un compte
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: t.muted, fontFamily: t.font.body }]}>
              Continuer sans compte
            </Text>
          </Pressable>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: t.muted, fontFamily: t.font.body }]}>
          En continuant, tu acceptes nos{" "}
          <Text style={{ textDecorationLine: "underline" }}>Conditions</Text> et notre{" "}
          <Text style={{ textDecorationLine: "underline" }}>Politique de confidentialité</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    zIndex: 0,
  },
  container: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: "center",
  },
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoImage: {
    width: 28,
    height: 28,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  carousel: {
    flex: 1,
    maxHeight: "55%",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  textContainer: {
    alignItems: "center",
    maxWidth: 340,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  indicatorsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
    transition: "all 0.3s",
  },
  actionsContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#137fec",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
  },
  footer: {
    textAlign: "center",
    fontSize: 12,
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
});
