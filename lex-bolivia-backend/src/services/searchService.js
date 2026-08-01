const { documents } = require("../config/documents");

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

module.exports = {
  normalizeText,
  searchDocuments,
};
