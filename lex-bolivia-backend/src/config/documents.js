const documents = [
  {
    key: "constitucion-bolivia",
    title: "Constitucion de Bolivia",
    description: "Norma suprema del Estado Plurinacional de Bolivia.",
    aliases: ["constitucion", "constitucion bolivia", "cpe", "politica del estado"],
    cover: "assets/portadas/constitucion.png",
    pdf: "pdf/constitucion_bolivia.pdf",
  },
  {
    key: "codigo-civil-bolivia",
    title: "Codigo Civil de Bolivia",
    description: "Reglas generales sobre personas, bienes y obligaciones civiles.",
    aliases: ["codigo civil", "civil bolivia"],
    cover: "assets/portadas/codigo_civil.png",
    pdf: "pdf/codigo_civil_bolivia.pdf",
  },
  {
    key: "codigo-penal-bolivia",
    title: "Codigo Penal de Bolivia",
    description: "Tipificacion de delitos y penas aplicables en Bolivia.",
    aliases: ["codigo penal", "penal bolivia"],
    cover: "assets/portadas/codigo_penal.png",
    pdf: "pdf/codigo penal_bolivia.pdf",
  },
  {
    key: "codigo-procesal-civil-bolivia",
    title: "Codigo Procesal Civil de Bolivia",
    description: "Ley 439 sobre el nuevo Codigo Procesal Civil de Bolivia.",
    aliases: ["codigo procesal", "procesal civil", "ley 439", "codigo procesal civil"],
    cover: "assets/portadas/codigo_procesal.png",
    pdf: "pdf/ley-439-nuevo-codigo-procesal-civil.pdf",
  },
  {
    key: "ley-general-del-trabajo-bolivia",
    title: "Ley General del Trabajo de Bolivia",
    description: "Norma laboral fundamental de Bolivia (1942).",
    aliases: ["ley general del trabajo", "trabajo bolivia", "norma laboral"],
    cover: "assets/portadas/ley_general_del_trabajo.png",
    pdf: "pdf/Ley general del trabajo del 8 de diciembre de 1942.pdf",
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
