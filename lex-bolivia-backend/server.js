const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const frontendCandidates = [
  path.resolve(__dirname, "..", "lex-bolivia-frontend"),
  path.resolve(__dirname, "lex-bolivia-frontend"),
  path.resolve(__dirname, "public"),
];

const FRONTEND_DIR = frontendCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "index.html")),
);

const documents = [
  {
    key: "constitucion-bolivia",
    title: "Constitucion de Bolivia",
    description: "Norma suprema del Estado Plurinacional de Bolivia.",
    aliases: ["constitucion", "constitucion bolivia", "cpe", "politica del estado"],
  },
  {
    key: "codigo-civil-bolivia",
    title: "Codigo Civil de Bolivia",
    description: "Reglas generales sobre personas, bienes y obligaciones civiles.",
    aliases: ["codigo civil", "civil bolivia"],
  },
  {
    key: "codigo-penal-bolivia",
    title: "Codigo Penal de Bolivia",
    description: "Tipificacion de delitos y penas aplicables en Bolivia.",
    aliases: ["codigo penal", "penal bolivia"],
  },
];

app.use(express.json());

// Allow frontend hosted in another Railway service to call this API.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function searchDocuments(query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery.split(" ").filter(Boolean);

  return documents
    .map((doc) => {
      const target = normalizeText(`${doc.title} ${doc.aliases.join(" ")}`);
      let score = 0;

      if (target.includes(normalizedQuery)) {
        score += 3;
      }

      tokens.forEach((token) => {
        if (target.includes(token)) {
          score += 1;
        }
      });

      return {
        score,
        doc,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => ({
      key: entry.doc.key,
      title: entry.doc.title,
      description: entry.doc.description,
    }));
}

app.post("/api/search", (req, res) => {
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

app.post("/api/voice-search", (req, res) => {
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

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

if (FRONTEND_DIR) {
  app.use(express.static(FRONTEND_DIR));

  app.get("/", (req, res) => {
    return res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    return res.status(200).json({
      ok: true,
      message: "Backend activo, pero no se encontro el frontend en el contenedor.",
    });
  });
}

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
