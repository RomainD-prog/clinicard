import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function TabsLayout() {
  const t = useStitchTheme();
  const router = useRouter();
  const { decks } = useAppStore();
  const [hasDueCards, setHasDueCards] = useState(false);

  // Vérifie s'il y a au moins une carte à réviser
  useEffect(() => {
    (async () => {
      if (decks.length === 0) {
        setHasDueCards(false);
        return;
      }

      const reviews = await repo.listReviews();
      let foundDue = false;

      for (const d of decks) {
        const dueForDeck = await repo.dueCardsForDeck(d);
        if (dueForDeck.length > 0) {
          foundDue = true;
          break;
        }
      }

      setHasDueCards(foundDue);
    })();
  }, [decks]);

  const handlePlayPress = () => {
    if (hasDueCards) {
      // Lance une session mixte avec toutes les cartes
      router.push("/review/session?deckId=all");
    } else {
      router.push("/import");
    }
  };

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
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Cours",
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" color={color} size={size} />,
        }}
      />
      
      {/* Bouton Play central - reproduit Start Focus Session */}
      <Tabs.Screen
        name="explore"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={styles.playButtonContainer}>
              <Pressable
                onPress={handlePlayPress}
                style={({ pressed }) => [
                  styles.playButton,
                  { 
                    backgroundColor: t.primary,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }]
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
          tabBarIcon: ({ color, size }) => <Ionicons name="school-outline" color={color} size={size} />,
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          title: "Réglages",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
      
      {/* Onglets cachés */}
      <Tabs.Screen
        name="import"
        options={{
          href: null, // Cache l'onglet
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
