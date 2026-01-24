import "react-native-get-random-values";

// Optionnel : seulement si tu vois encore TextEncoder/TextDecoder manquants.
// (RN 0.81/Hermes les a souvent déjà)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const te = require("text-encoding");
  const TextEncoderPoly = te?.TextEncoder ?? te?.default?.TextEncoder;
  const TextDecoderPoly = te?.TextDecoder ?? te?.default?.TextDecoder;

  if (typeof (globalThis as any).TextEncoder !== "function" && TextEncoderPoly) {
    (globalThis as any).TextEncoder = TextEncoderPoly;
  }
  if (typeof (globalThis as any).TextDecoder !== "function" && TextDecoderPoly) {
    (globalThis as any).TextDecoder = TextDecoderPoly;
  }
} catch {}
