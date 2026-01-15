import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from "../src/services/purchases";
import { useAppStore } from "../src/store/useAppStore";
import { useStitchTheme } from "../src/uiStitch/theme";

type Package = {
  identifier: string;
  product: {
    title: string;
    description: string;
    priceString: string;
  };
};

export default function PaywallScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const { refreshSubscriptionStatus } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    try {
      const offering = await getOfferings();
      if (offering?.availablePackages) {
        setPackages(offering.availablePackages as any);
      }
    } catch (e) {
      console.error("[Paywall] Erreur chargement offres:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(pkg: Package) {
    setPurchasing(true);
    try {
      const { success } = await purchasePackage(pkg);
      if (success) {
        await refreshSubscriptionStatus();
        Alert.alert(
          "🎉 Bienvenue !",
          "Tu as maintenant accès à toutes les fonctionnalités premium.",
          [
            {
              text: "Continuer",
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de finaliser l'achat");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setPurchasing(true);
    try {
      const { success } = await restorePurchases();
      await refreshSubscriptionStatus();
      if (success) {
        Alert.alert("✅ Restauré", "Tes achats ont été restaurés avec succès");
        router.back();
      } else {
        Alert.alert("Aucun achat", "Aucun abonnement trouvé sur ce compte");
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de restaurer");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={10}
        >
          <Ionicons name="close" size={22} color={t.text} />
        </Pressable>

        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: t.text,
            fontFamily: t.font.display,
            fontSize: 16,
          }}
        >
          CliniCard Premium
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Hero */}
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(19,127,236,0.12)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons name="sparkles" size={40} color={t.primary} />
          </View>

          <Text
            style={{
              color: t.text,
              fontFamily: t.font.display,
              fontSize: 28,
              textAlign: "center",
            }}
          >
            Passe en Premium
          </Text>

          <Text
            style={{
              marginTop: 8,
              color: t.muted,
              fontFamily: t.font.body,
              fontSize: 16,
              textAlign: "center",
            }}
          >
            Génère autant de decks que tu veux avec l'IA
          </Text>
        </View>

        {/* Features */}
        <View
          style={[
            styles.card,
            { backgroundColor: t.card, borderColor: t.border },
          ]}
        >
          <Feature
            icon="infinite-outline"
            title="Decks illimités"
            subtitle="Génère autant de cours que tu veux avec l'IA"
          />
          <Divider />
          <Feature
            icon="flash-outline"
            title="IA optimisée"
            subtitle="Flashcards et QCMs de meilleure qualité"
          />
          <Divider />
          <Feature
            icon="cloud-done-outline"
            title="Sync multi-devices"
            subtitle="Accède à tes cours partout"
          />
          <Divider />
          <Feature
            icon="analytics-outline"
            title="Stats avancées"
            subtitle="Analyse détaillée de tes révisions"
          />
        </View>

        {/* Plans */}
        {loading ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : packages.length === 0 ? (
          <View
            style={[
              styles.card,
              { backgroundColor: t.card, borderColor: t.border, padding: 16 },
            ]}
          >
            <Text
              style={{
                color: t.muted,
                fontFamily: t.font.body,
                textAlign: "center",
              }}
            >
              Aucune offre disponible pour le moment
            </Text>
          </View>
        ) : (
          packages.map((pkg) => (
            <PlanCard
              key={pkg.identifier}
              title={pkg.product.title}
              price={pkg.product.priceString}
              popular={pkg.identifier.includes("annual")}
              onPress={() => handlePurchase(pkg)}
              disabled={purchasing}
            />
          ))
        )}

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          disabled={purchasing}
          style={{ marginTop: 20, padding: 10 }}
        >
          <Text
            style={{
              color: t.primary,
              fontFamily: t.font.semibold,
              textAlign: "center",
              fontSize: 14,
            }}
          >
            Restaurer mes achats
          </Text>
        </Pressable>

        {/* Legal */}
        <Text
          style={{
            marginTop: 20,
            color: t.muted,
            fontFamily: t.font.body,
            fontSize: 11,
            textAlign: "center",
            lineHeight: 16,
          }}
        >
          L'abonnement est géré via ton compte Apple/Google. Annulable à tout
          moment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  const t = useStitchTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: 14 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: t.dark ? "#283039" : "#EEF2FF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={t.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: t.text,
            fontFamily: t.font.display,
            fontSize: 15,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 2,
            color: t.muted,
            fontFamily: t.font.body,
            fontSize: 13,
          }}
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
    </View>
  );
}

function Divider() {
  const t = useStitchTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: t.border,
        marginLeft: 66,
      }}
    />
  );
}

function PlanCard({
  title,
  price,
  popular,
  onPress,
  disabled,
}: {
  title: string;
  price: string;
  popular?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.planCard,
        {
          backgroundColor: popular ? t.primary : t.card,
          borderColor: popular ? t.primary : t.border,
          opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {popular && (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.2)",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontFamily: t.font.semibold,
              fontSize: 10,
              letterSpacing: 1,
            }}
          >
            POPULAIRE
          </Text>
        </View>
      )}

      <Text
        style={{
          color: popular ? "#fff" : t.text,
          fontFamily: t.font.display,
          fontSize: 18,
        }}
      >
        {title}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          marginTop: 8,
          gap: 4,
        }}
      >
        <Text
          style={{
            color: popular ? "#fff" : t.text,
            fontFamily: t.font.display,
            fontSize: 32,
          }}
        >
          {price}
        </Text>
        <Text
          style={{
            color: popular ? "rgba(255,255,255,0.7)" : t.muted,
            fontFamily: t.font.body,
            fontSize: 14,
          }}
        >
          {title.includes("Mensuel") ? "/mois" : "/an"}
        </Text>
      </View>

      {title.includes("Annuel") && (
        <Text
          style={{
            marginTop: 8,
            color: popular ? "rgba(255,255,255,0.85)" : t.muted,
            fontFamily: t.font.body,
            fontSize: 13,
          }}
        >
          Soit 2,49€/mois • Économise 38%
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 16,
  },
  planCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    marginBottom: 12,
  },
});
