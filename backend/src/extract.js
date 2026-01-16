import pdf from "pdf-parse";

export async function extractTextFromUpload({ buffer, mimeType }) {
  if (mimeType === "application/pdf") {
    const out = await pdf(buffer);
    return (out.text ?? "").trim();
  }
  return buffer.toString("utf8").trim();
}
