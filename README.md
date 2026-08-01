# Proyecto_AndiLab
Proyecto AndiLab beta 
Aplicacion: Yandex

# Tecnologias utilizadas:
* HTML5 & CSS3
* JavaScript
* Web Speech API
* Node.js
* Google Fonts
* Google Gemini API
* PDF Parse

# Caracteristicas Principales

* Busqueda por texto y voz: Permite realizar consultas de texto tradicionales y búsquedas por comandos de voz utilizando la API de voz del navegador
* Autocompletado y sugerencias: Muestra coincidencias de documentos en tiempo real mientras el usuario escribe, incluyendo soporte para navegación ágil mediante el teclado
* Carrusel dinamico: Cuenta con una sección de documentos recomendados en la pantalla principal que incluye botones de navegación y rotación automática temporizada.
* Lector PDF: Abre los documentos seleccionados en una vista de lectura dedicada y utiliza parametros de URL para buscar y resaltar automáticamente la cláusula o término específico consultado dentro del PDF.
* Asistente virtual: Cuenta con un asistente virtual basado en los modelos Gemini de Google (Gemini 1.5 Flash y Gemini 2.0 Flash) configurado para actuar como guía del sitio y asistente juridico. Puede responder preguntas generales sobre la plataforma o extraer respuestas directamente del contexto de un documento legal específico utilizando pdf-parse.

# Arquitectura
## Front-End
* index.html: Estructura principal del buscador, barra de navegacion, contenedor del carrusel, asistente del sitio, opciones para el cambio de idioma.
* styles.css: Hoja de estilos global con variables CSS, animaciones y media queries.
* app.js: Logica principal del frontend, manejo del DOM, control del carrusel, reconocimiento de voz y conexion asincrona con la API.
* lectura-pdf.html / lectura.html: Estructuras de las interfaces dedicadas para la visualización del panel lector.
* lectura-pdf.js / lectura.js: Scripts encargados de interceptar los parámetros de la URL y cargar dinamicamente el titulo, la portada y el archivo PDF correcto.
* biblioteca.html: Pantalla que funciona como un repositorio visual de los documentos. Muestra una cuadricula con las portadas de todos los documentos y una barra para filtrarlos por nombre.


## Back-End
* carpeta src/: Esta carpeta contiene toda la logica del lado del servidor, encargada de proveer datos al frontend y comunicarse con inteligencias artificiales externas.
* carpeta src/app.js: Configura el framework Express. 
** Se encarga de configurar CORS, configura el servidor para que pueda entender datos enviados en formato JSON, conecta la ruta base /api con todas las rutas definidas en el archivo de rutas y tiene una ruta /health que sirve como un "latido" para comprobar que el servidor esta vivo y funcionando.

* carpeta src/routes/apiRoutes.js: Crea el enrutador principal del sistema.
* createApiRouter: Inicializa el enrutador y los servicios.
* /assistant/site-guide: Tiene una logica interna (askSiteGuide) que crea un "prompt" (instruccion) especifico para Gemini, diciendole que actue solo como un guia de uso de la plataforma web, asegurandose de que responda en espanol simple y no de consejos legales.
* /search y /voice-search: Reciben la palabra que el usuario escribio o dicto, se la pasan al servicio de busqueda y devuelven el resultado en JSON.
* /assistant: Verifica primero si existe la clave API de Google Gemini (GEMINI_API_KEY). Si existe, recibe la pregunta del usuario y el nombre del documento, y le pasa ese trabajo pesado al assistantService. Tambien captura cualquier error y devuelve mensajes amigables al usuario (por ejemplo, un error 503 si falta la clave).

* carpeta src/services/: Contiene la logica de negocio y el procesamiento pesado de datos.
* funcion normalizeText: toma cualquier texto, lo pasa a minusculas y le quita caracteres especiales para que la busqueda sea exacta.
* funcion searchDocuments: revisa la lista de documentos, compara la busqueda del usuario con el titulo y los alias de cada archivo, y suma puntos (score). Si hay coincidencias, devuelve los 6 mejores resultados ordenados de mayor a menor puntuacion.
* src/services/assistantService.js: Es el archivo mas complejo. Gestiona la comunicacion con Google Gemini y la lectura de PDFs.
* loadPdfTextByDocKey: Usa la libreria externa pdf-parse para abrir fisicamente el archivo PDF de la ley y extraer todo su texto puro. Para no hacer esto cada vez que alguien pregunta, guarda el texto en una memoria temporal (cache).
* extractRelevantContext: Esta funcion busca palabras clave de la pregunta del usuario dentro del texto del PDF y extrae solo los parrafos mas relevantes (hasta un maximo de caracteres). Asi, solo le envia a Gemini la parte de la ley que importa.
* askGeminiWithContext: Arma un "paquete" (payload JSON) con instrucciones muy estrictas: le dice a Gemini que es el asistente de Yatilex, le entrega el contexto extraido del PDF, y le da la pregunta del usuario. Le prohibe inventar informacion.
* callGeminiEndpoint: Hace la conexion HTTP real a los servidores de Google Generative Language usando fetch. Tiene mecanismos de seguridad, como un "AbortController", para cancelar la peticion si Google tarda mas de 25 segundos en responder.
* src/config/: Guarda variables estaticas o configuraciones globales.
* src/config/documents.js: Simula una BD estatica de documentos.Es una lista (array) que contiene los identificadores (key), titulos, pequenas descripciones y las rutas fisicas donde estan guardados los archivos PDF reales. Todo el backend consulta este archivo para saber que documentos existen.

# Catalogo de Documentos Actual
* Constitución de Bolivia.  
* Código Civil de Bolivia.  
* Código Penal de Bolivia.  
* Código Procesal Civil de Bolivia.  
* Ley General del Trabajo de Bolivia.  
