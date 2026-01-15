import { Lexend_300Light, Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, useFonts } from "@expo-google-fonts/lexend";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LoadingBlock } from "../src/components/LoadingBlock";
import { initPurchases } from "../src/services/purchases";
import { useAppStore } from "../src/store/useAppStore";

export default function RootLayout() {
  const { isReady, bootstrap, userId, refreshSubscriptionStatus } = useAppStore();

  const [fontsLoaded] = useFonts({
    Lexend_300Light,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  useEffect(() => {
    async function init() {
      await bootstrap();
      // ✅ Initialiser RevenueCat après bootstrap pour avoir le userId
      if (userId) {
        await initPurchases(userId);
        await refreshSubscriptionStatus();
      }
    }
    init();
  }, []);

  if (!isReady || !fontsLoaded) {
    return (
      <View style={{ padding: 20, marginTop: 40 }}>
        <LoadingBlock label="Initialisation…" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
    <Stack
      screenOptions={{
            headerShown: false, // ✅ Désactive par défaut, mais on réactive pour certains écrans
        headerTitleStyle: { fontFamily: "Lexend_700Bold" },
            headerBackTitle: "Retour", // ✅ Texte du bouton retour au lieu de "(tabs)"
      }}
    >
      <Stack screenOptions={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="import/index" options={{ headerShown: false }} />
      <Stack.Screen name="import/options" options={{ headerShown: false }} />
      <Stack.Screen name="job/[jobId]" options={{ headerShown: true, title: "Génération" }} />
      <Stack.Screen name="deck/[deckId]" options={{ headerShown: false }} />
      <Stack.Screen name="deck/[deckId]/quiz" options={{ headerShown: false }} />
      <Stack.Screen name="review/session" options={{ headerShown: true, title: "Révision" }} />
      <Stack.Screen name="paywall" options={{ headerShown: true, title: "Premium" }} />
      <Stack.Screen name="deck/[deckId]/cards" options={{ headerShown: false }} />
      <Stack.Screen name="deck/[deckId]/stats" options={{ headerShown: false }} />
      <Stack.Screen name="deck/[deckId]/card-editor" options={{ headerShown: true, title: "Modifier" }} />
      <Stack.Screen name="deck/[deckId]/quiz-history" options={{ headerShown: true, title: "Historique QCM" }} />
      <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
    </Stack>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
