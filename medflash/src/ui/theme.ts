// src/ui/theme.ts
export const theme = {
    colors: {
      bg: "#F5F7FF",          // doux / clean
      card: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "rgba(15, 23, 42, 0.10)",
  
      // Doctolib-ish + Duolingo energy
      primary: "#1D4ED8",     // bleu propre
      primaryDark: "#1E40AF",
      accent: "#10B981",      // vert "progress"
      danger: "#EF4444",
  
      // surfaces
      softBlue: "rgba(29, 78, 216, 0.10)",
      softGreen: "rgba(16, 185, 129, 0.12)",
    },
    radius: {
      sm: 12,
      md: 16,
      lg: 20,
      pill: 999,
    },
    spacing: (n: number) => n * 8,
    shadow: {
      card: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      },
      button: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
      },
    },
    text: {
      h1: { fontSize: 22, fontWeight: "900" as const },
      h2: { fontSize: 18, fontWeight: "900" as const },
      body: { fontSize: 14, fontWeight: "600" as const },
      muted: { fontSize: 13, fontWeight: "600" as const },
    },
  };
  