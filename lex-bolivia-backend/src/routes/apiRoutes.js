const express = require("express");
const { documents } = require("../config/documents");
const { searchDocuments } = require("../services/searchService");
const { createAssistantService } = require("../services/assistantService");

function createApiRouter({ runtimeFrontendDir, geminiModel, geminiApiKey }) {
  const router = express.Router();
  const assistantService = createAssistantService({
    runtimeFrontendDir,
    model: geminiModel,
    apiKey: geminiApiKey,
  });

  router.post("/search", (req, res) => {
    const query = (req.body?.query || "").trim();
    const results = searchDocuments(query);

    return res.status(200).json({
      ok: true,
      message: results.length
        ? `Se encontraron ${results.length} resultado(s).`
        : "No se encontraron resultados.",
      results,
    });
  });

  router.post("/voice-search", (req, res) => {
    const query = (req.body?.query || "").trim();
    const results = searchDocuments(query);

    return res.status(200).json({
      ok: true,
      message: results.length
        ? `Busqueda por voz completada con ${results.length} resultado(s).`
        : "No se encontraron resultados para la busqueda por voz.",
      results,
    });
  });

  router.post("/assistant", async (req, res) => {
    try {
      if (!geminiApiKey) {
        return res.status(503).json({
          ok: false,
          message: "Falta configurar GEMINI_API_KEY en Railway.",
        });
      }

      const question = String(req.body?.question || "").trim();
      const docKey = String(req.body?.docKey || "").trim();
      const history = req.body?.history;

      if (!question) {
        return res.status(400).json({
          ok: false,
          message: "La pregunta es obligatoria.",
        });
      }

      if (!documents.some((doc) => doc.key === docKey)) {
        return res.status(400).json({
          ok: false,
          message: "Documento no valido para el asistente.",
        });
      }

      const answer = await assistantService.askFromDocument({
        docKey,
        question,
        history,
      });

      return res.status(200).json({
        ok: true,
        answer,
      });
    } catch (error) {
      const message = error?.userMessage || "No se pudo procesar la consulta del asistente.";
      const statusCode = Number(error?.statusCode || 500);
      const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

      return res.status(safeStatus).json({
        ok: false,
        message,
      });
    }
  });

  router.get("/assistant/status", (req, res) => {
    return res.status(200).json({
      ok: true,
      geminiConfigured: Boolean(geminiApiKey),
      model: geminiModel,
    });
  });

  return router;
}

module.exports = {
  createApiRouter,
};
