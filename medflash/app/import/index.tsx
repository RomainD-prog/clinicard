// app/import/index.tsx
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


import { useAppStore } from "../../src/store/useAppStore";
import { useStitchTheme } from "../../src/uiStitch/theme";
import { uid } from "../../src/utils/ids";

type Mode = "pdf" | "text";

function Card({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {children}
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string | number }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={{ color: t.muted, fontFamily: t.font.semibold, fontSize: 11, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ marginTop: 4, color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
        {value}
      </Text>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? t.primary : t.card,
          borderColor: active ? t.primary : t.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={active ? "#fff" : t.muted} />
      <Text style={{ color: active ? "#fff" : t.text, fontFamily: t.font.display, fontSize: 14 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PrimaryBtn({
  title,
  onPress,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        { backgroundColor: t.primary, opacity: disabled ? 0.45 : pressed ? 0.9 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

function SecondaryBtn({
  title,
  onPress,
  icon,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryBtn,
        { backgroundColor: t.card, borderColor: t.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={t.text} /> : null}
      <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export default function ImportScreen() {
  const router = useRouter();
  const t = useStitchTheme();

  const { selectedFile, setSelectedFile, level, freeImportsRemaining, creditsBalance } = useAppStore();

  const [mode, setMode] = useState<Mode>("pdf");
  const [textValue, setTextValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canContinue = useMemo(() => !!selectedFile, [selectedFile]);

  function goBackSmart() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSelectedFile(null);
  }

  async function pickPdf() {
    setError(null);

    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled) return;

    const f = res.assets?.[0];
    if (!f?.uri) {
      setError("Fichier invalide.");
      return;
    }

    setSelectedFile({
      uri: f.uri,
      name: f.name ?? "document.pdf",
      mimeType: f.mimeType ?? "application/pdf",
      size: f.size,
    });
  }

  async function useTextAsSource() {
    setError(null);
    const v = textValue.trim();
    if (v.length < 50) {
      setError("Colle au moins quelques lignes (min ~50 caractères).");
      return;
    }

    const dir = FileSystem.cacheDirectory;
    if (!dir) {
      setError("Cache indisponible (FileSystem).");
      return;
    }

    try {
      const path = `${dir}${uid("notes_")}.txt`;
      await FileSystem.writeAsStringAsync(path, v, { encoding: FileSystem.EncodingType.UTF8 });

      setSelectedFile({
        uri: path,
        name: "notes.txt",
        mimeType: "text/plain",
        size: v.length,
      });
    } catch (e: any) {
      setError(e?.message ?? "Impossible de créer le fichier texte.");
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Top bar custom */}
      <View style={styles.topBar}>
        <Pressable onPress={goBackSmart} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={{ flex: 1, textAlign: "center", color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
          Importer
        </Text>

        <Pressable onPress={() => router.push("/(tabs)/settings")} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="settings-outline" size={20} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Meta pills */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pill label="Source" value={mode === "pdf" ? "PDF" : "Texte"} />
          <Pill label="Niveau" value={level} />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Pill label="Imports gratuits" value={freeImportsRemaining()} />
          <Pill label="Crédits" value={creditsBalance} />
        </View>

        {/* 1) Source */}
        <Card>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>
            1) Choisir une source
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Chip label="PDF" icon="document-text-outline" active={mode === "pdf"} onPress={() => switchMode("pdf")} />
            <Chip label="Texte" icon="create-outline" active={mode === "text"} onPress={() => switchMode("text")} />
          </View>

          {mode === "pdf" ? (
            <>
              <View style={{ height: 12 }} />
              
              {/* Sous-action indentée et plus petite */}
              <View style={{ marginLeft: 12, marginTop: 8 }}>
                <Pressable
                onPress={pickPdf}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: t.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    borderWidth: 1,
                    borderColor: t.border,
                  }}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color={t.muted} />
                  <Text style={{ color: t.text, fontFamily: t.font.body, fontSize: 14 }}>
                    {selectedFile ? "Changer de PDF" : "Sélectionner un PDF"}
                  </Text>
                </Pressable>

                <Text style={{ marginTop: 8, color: t.muted, fontFamily: t.font.body, fontSize: 13, marginLeft: 4 }}>
                {selectedFile ? `✅ ${selectedFile.name}` : "Aucun fichier sélectionné."}
              </Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ height: 12 }} />
              
              {/* Sous-zone indentée */}
              <View style={{ marginLeft: 12, marginTop: 8 }}>
              <View
                style={[
                  styles.textBox,
                  { backgroundColor: t.dark ? "#161a20" : "#F8FAFC", borderColor: t.border },
                ]}
              >
                <TextInput
                  value={textValue}
                  onChangeText={setTextValue}
                  placeholder="Colle ici ton cours / tes notes…"
                  placeholderTextColor={t.muted}
                  multiline
                  style={{
                    color: t.text,
                    fontFamily: t.font.body,
                    fontSize: 15,
                    minHeight: 140,
                    textAlignVertical: "top",
                  }}
                />
              </View>

              <View style={{ height: 12 }} />

                <Pressable
                  onPress={useTextAsSource}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: t.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    borderWidth: 1,
                    borderColor: t.border,
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={t.muted} />
                  <Text style={{ color: t.text, fontFamily: t.font.body, fontSize: 14 }}>
                    Utiliser ce texte
                  </Text>
                </Pressable>

              {selectedFile ? (
                  <Text style={{ marginTop: 8, color: t.muted, fontFamily: t.font.body, fontSize: 13, marginLeft: 4 }}>
                  ✅ Texte prêt
                </Text>
              ) : null}
              </View>
            </>
          )}
        </Card>

        {/* error */}
        {error ? (
          <View
            style={[
              styles.errBox,
              { borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.10)" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
            <Text style={{ color: "#ef4444", fontFamily: t.font.body, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {/* 2) Continuer */}
        <Card>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>
            2) Continuer
          </Text>

          <View style={{ height: 12 }} />

          <PrimaryBtn
            title="Choisir les options"
            icon="arrow-forward-outline"
            onPress={() => router.push("/import/options")}
            disabled={!canContinue}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
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
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 14,
  },

  pill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },

  chip: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  primaryBtn: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  secondaryBtn: {
    height: 54,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  textBox: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },

  errBox: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
 