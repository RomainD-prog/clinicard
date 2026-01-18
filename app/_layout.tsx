import { Lexend_300Light, Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, useFonts } from "@expo-google-fonts/lexend";
import { Stack } from "expo-router";
import { useEffect } from "react";
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

  // Bootstrap de l'app (auth, storage, etc.)
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // RevenueCat : seulement quand le userId est connu
  useEffect(() => {
    if (!isReady || !userId) return;

    (async () => {
      await initPurchases(userId);
      await refreshSubscriptionStatus();
    })().catch((e) => {
      // Ne bloque pas le rendu/navigation en cas d'erreur RevenueCat
      console.warn("[purchases] init failed", e);
    });
  }, [isReady, userId, refreshSubscriptionStatus]);

  const showLoading = !isReady || !fontsLoaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* IMPORTANT: Toujours monter le navigator au 1er render (évite les erreurs de Hooks dans expo-router) */}
        <Stack
          screenOptions={{
            headerShown: false,
            headerTitleStyle: { fontFamily: "Lexend_700Bold" },
            headerBackTitle: "Retour",
          }}
        />

        {showLoading ? (
          <View
            pointerEvents="auto"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: 20,
              paddingTop: 40,
              justifyContent: "flex-start",
              backgroundColor: "white",
            }}
          >
            <LoadingBlock label="Initialisation…" />
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
