import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { useStitchTheme } from "../../src/uiStitch/theme";

function withTimeout<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

export default function TabsLayout() {
  const t = useStitchTheme();
  const router = useRouter();

  const decks = useAppStore((s: any) => s.decks) as any[];

  // On évite toute requête DB au montage (ça peut geler certains environnements).
  // On calcule "hasDueCards" uniquement quand l'utilisateur appuie sur Play.
  const handlePlayPress = useCallback(async () => {
    try {
      if (!decks || decks.length === 0) {
        router.push("/import");
        return;
      }

      for (const d of decks) {
        const dueForDeck = await withTimeout(repo.dueCardsForDeck(d), 4000).catch((e) => {
          console.warn("[TabsLayout] dueCardsForDeck failed:", e);
          return [] as any[];
        });

        if (dueForDeck.length > 0) {
          router.push("/review/session?deckId=all");
          return;
        }
      }

      router.push("/import");
    } catch (e) {
      console.warn("[TabsLayout] handlePlayPress failed:", e);
      router.push("/import");
    }
  }, [decks, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: {
          fontFamily: t.font.medium,
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: t.bg,
          borderTopColor: t.border,
          height: 86,
          paddingTop: 8,
          paddingBottom: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: "Cours",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Bouton Play central */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={styles.playButtonContainer}>
              <Pressable
                onPress={handlePlayPress}
                style={({ pressed }) => [
                  styles.playButton,
                  {
                    backgroundColor: t.primary,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <Ionicons name="play" size={28} color="#fff" />
              </Pressable>
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handlePlayPress();
          },
        }}
      />

      <Tabs.Screen
        name="review"
        options={{
          title: "Réviser",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />

      {/* Onglets cachés */}
      <Tabs.Screen
        name="import"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  playButtonContainer: {
    position: "absolute",
    top: -20,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
