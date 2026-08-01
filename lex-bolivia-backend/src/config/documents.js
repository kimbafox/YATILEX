const documents = [
  {
    key: "constitucion-bolivia",
    title: "Constitucion de Bolivia",
    description: "Norma suprema del Estado Plurinacional de Bolivia.",
    aliases: ["constitucion", "constitucion bolivia", "cpe", "politica del estado"],
    pdf: "pdf/constitucion_bolivia.pdf",
  },
  {
    key: "codigo-civil-bolivia",
    title: "Codigo Civil de Bolivia",
    description: "Reglas generales sobre personas, bienes y obligaciones civiles.",
    aliases: ["codigo civil", "civil bolivia"],
    pdf: "pdf/codigo_civil_bolivia.pdf",
  },
  {
    key: "codigo-penal-bolivia",
    title: "Codigo Penal de Bolivia",
    description: "Tipificacion de delitos y penas aplicables en Bolivia.",
    aliases: ["codigo penal", "penal bolivia"],
    pdf: "pdf/codigo penal_bolivia.pdf",
  },
];

const documentByKey = documents.reduce((acc, doc) => {
  acc[doc.key] = doc;
  return acc;
}, {});

module.exports = {
  documents,
  documentByKey,
};
