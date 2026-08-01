const express = require("express");
const fs = require("fs");
const path = require("path");
const { createApiRouter } = require("./routes/apiRoutes");

const app = express();
const projectRoot = path.resolve(__dirname, "..");

const frontendCandidates = [
  path.resolve(projectRoot, "public"),
  path.resolve(projectRoot, "..", "lex-bolivia-frontend"),
  path.resolve(projectRoot, "lex-bolivia-frontend"),
];

const frontendDir = frontendCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html")),
);

const runtimeFrontendDir = frontendDir || path.resolve(projectRoot, "public");
const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const geminiApiKey = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use("/api", createApiRouter({ runtimeFrontendDir, geminiModel, geminiApiKey }));

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

if (frontendDir) {
  app.use(express.static(frontendDir));

  app.get("/", (req, res) => {
    return res.sendFile(path.join(frontendDir, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    return res.status(200).json({
      ok: true,
      message: "Backend activo, pero no se encontro el frontend en el contenedor.",
    });
  });
}

module.exports = {
  app,
};
