import { Deck } from "../types/models";

function cleanField(s: string): string {
  // TSV: on évite les tabs qui cassent les colonnes
  return (s ?? "").replace(/\t/g, "    ").trim();
}

export function deckToAnkiTSV(deck: Deck): string {
  // Format Anki import: Front<TAB>Back
  const lines = deck.cards.map((c) => `${cleanField(c.question)}\t${cleanField(c.answer)}`);
  return lines.join("\n");
}

export function deckToJSON(deck: Deck): string {
  return JSON.stringify(deck, null, 2);
}

export function deckToQuizText(deck: Deck): string {
  return deck.mcqs
    .map((q, i) => {
      const choices = q.choices.map((c) => `${c.label}. ${c.text}`).join("\n");
      return `Q${i + 1}. ${q.stem}\n${choices}\nRéponse: ${q.correctLabel}\nExplication: ${q.explanation}\n`;
    })
    .join("\n---\n\n");
}
