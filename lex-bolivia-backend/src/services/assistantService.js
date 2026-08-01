const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { documentByKey } = require("../config/documents");
const { normalizeText } = require("./searchService");

function createAssistantService({ runtimeFrontendDir, model, apiKey }) {
  const pdfTextCache = new Map();

  async function loadPdfTextByDocKey(docKey) {
    const selectedDoc = documentByKey[docKey];
    if (!selectedDoc) {
      throw new Error("Documento no permitido.");
    }

    if (pdfTextCache.has(docKey)) {
      return pdfTextCache.get(docKey);
    }

    const absolutePath = path.join(runtimeFrontendDir, selectedDoc.pdf);
    const fileBuffer = await fs.promises.readFile(absolutePath);
    const parsed = await pdfParse(fileBuffer);
    const normalizedPdfText = (parsed.text || "").replace(/\s+/g, " ").trim();

    pdfTextCache.set(docKey, normalizedPdfText);
    return normalizedPdfText;
  }

  function extractRelevantContext(pdfText, question) {
    const maxContextChars = 16000;
    const cleanedQuestion = normalizeText(question);
    const keywords = Array.from(new Set(cleanedQuestion.split(" ").filter((token) => token.length > 2)));

    if (!pdfText) {
      return "";
    }

    const chunks = pdfText
      .split(/(?<=[.!?])\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (!keywords.length) {
      return chunks.slice(0, 40).join(" ").slice(0, maxContextChars);
    }

    const scoredChunks = chunks
      .map((chunk) => {
        const normalizedChunk = normalizeText(chunk);
        const score = keywords.reduce((acc, keyword) => {
          return acc + (normalizedChunk.includes(keyword) ? 1 : 0);
        }, 0);

        return { chunk, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    const selected = [];
    let total = 0;

    for (const item of scoredChunks) {
      if (total + item.chunk.length > maxContextChars) {
        break;
      }

      selected.push(item.chunk);
      total += item.chunk.length;

      if (selected.length >= 80) {
        break;
      }
    }

    if (!selected.length) {
      return chunks.slice(0, 30).join(" ").slice(0, maxContextChars);
    }

    return selected.join(" ");
  }

  async function askGeminiWithContext({ question, docTitle, context, history }) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const systemInstruction = [
      "Eres el asistente juridico de Yatilex.",
      "Responde UNICAMENTE con la informacion del CONTEXTO OFICIAL recibido.",
      "No inventes, no uses conocimiento externo y no cites fuentes fuera del contexto.",
      "Si la respuesta no aparece en el contexto, responde exactamente: No encuentro esa informacion en el documento.",
      "Responde en espanol claro y breve.",
    ].join(" ");

    const safeHistory = Array.isArray(history)
      ? history.slice(-6).map((msg) => ({
        role: msg?.role === "model" ? "model" : "user",
        parts: [{ text: String(msg?.text || "").slice(0, 700) }],
      }))
      : [];

    const payload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        ...safeHistory,
        {
          role: "user",
          parts: [
            {
              text:
                `DOCUMENTO: ${docTitle}\n` +
                `CONTEXTO OFICIAL:\n${context}\n\n` +
                `PREGUNTA DEL USUARIO: ${question}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500,
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim() || "No encuentro esa informacion en el documento.";

    return answer;
  }

  async function askFromDocument({ docKey, question, history }) {
    const selectedDoc = documentByKey[docKey];
    if (!selectedDoc) {
      throw new Error("Documento no valido para el asistente.");
    }

    const pdfText = await loadPdfTextByDocKey(docKey);
    const context = extractRelevantContext(pdfText, question);

    return askGeminiWithContext({
      question,
      docTitle: selectedDoc.title,
      context,
      history,
    });
  }

  return {
    askFromDocument,
  };
}

module.exports = {
  createAssistantService,
};
