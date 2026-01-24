// src/uiStitch/subjectIcon.ts
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

function norm(s?: string) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Petit hash stable (même input => même output)
function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const KNOWN: Array<{ match: RegExp; icon: IoniconName; color: string }> = [
  { match: /(cardio|cardiologie)/, icon: "heart-outline", color: "#ef4444" },
  { match: /(anat|anatomie)/, icon: "body-outline", color: "#8b5cf6" },
  { match: /(neuro|neurologie)/, icon: "sparkles-outline", color: "#a855f7" }, // fallback "brain" n’existe pas en Ionicons
  { match: /(pharma|pharmacologie)/, icon: "medkit-outline", color: "#06b6d4" },
  { match: /(infect|microbio)/, icon: "bug-outline", color: "#22c55e" },
  { match: /(immuno)/, icon: "shield-checkmark-outline", color: "#22c55e" },
  { match: /(radio|imagerie)/, icon: "scan-outline", color: "#0ea5e9" },
  { match: /(chir|chirurgie)/, icon: "cut-outline", color: "#f97316" },
  { match: /(gyne|obst|grossesse)/, icon: "female-outline", color: "#ec4899" },
  { match: /(pedi|pediatrie)/, icon: "happy-outline", color: "#f59e0b" },
  { match: /(psy|psychiatrie)/, icon: "chatbubble-ellipses-outline", color: "#6366f1" },
  { match: /(derm|dermatologie)/, icon: "leaf-outline", color: "#22c55e" },
  { match: /(orl)/, icon: "ear-outline", color: "#0ea5e9" },
  { match: /(ophta|ophtalmo)/, icon: "eye-outline", color: "#0ea5e9" },
  { match: /(kine|physio|rehab|reeducation)/, icon: "walk-outline", color: "#3b82f6" },
];

const FALLBACK_ICONS: IoniconName[] = [
  "book-outline",
  "school-outline",
  "bandage-outline",
  "flask-outline",
  "pulse-outline",
  "fitness-outline",
  "leaf-outline",
  "planet-outline",
];

const FALLBACK_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#f97316", "#64748b",
];

export function subjectMeta(subject?: string) {
  const key = norm(subject);
  if (!key) {
    return { key: "sans-matiere", label: "Sans matière", icon: "book-outline" as IoniconName, color: "#64748b" };
  }

  for (const k of KNOWN) {
    if (k.match.test(key)) return { key, label: subject!, icon: k.icon, color: k.color };
  }

  const h = hashStr(key);
  const icon = FALLBACK_ICONS[h % FALLBACK_ICONS.length];
  const color = FALLBACK_COLORS[h % FALLBACK_COLORS.length];

  return { key, label: subject!, icon, color };
}

// utile pour un fond "pastel"
export function alphaColor(hex: string, a: number) {
  // hex "#RRGGBB"
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
