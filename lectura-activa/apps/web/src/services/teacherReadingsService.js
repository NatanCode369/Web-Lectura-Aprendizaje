/* Service de lecturas del docente — Dueño: José
 *
 * Complementa a readingsService.js (Omar, solo lectura del estudiante).
 * Aquí viven las operaciones de escritura: crear, editar, publicar.
 *
 * Contrato del backend (apps/api/src/modules/readings):
 *   POST  /readings              → crea en estado 'draft'
 *   PATCH /readings/:id          → edita (todos los campos opcionales)
 *   POST  /readings/:id/publish  → draft → published (exige ≥ 1 actividad)
 *   GET   /readings/:id          → detalle (el autor ve sus borradores)
 *   GET   /readings              → SOLO lecturas publicadas de la institución
 */

import { api } from "./apiClient.js";

/* ------------------------------------------------------------
   Dificultad: la interfaz del docente usa español, el API inglés
   ------------------------------------------------------------ */
const NIVEL_A_API = { basico: "easy", intermedio: "medium", avanzado: "hard" };
const NIVEL_DE_API = { easy: "basico", medium: "intermedio", hard: "avanzado" };

export const nivelToApi = (nivel) => NIVEL_A_API[nivel] || "easy";
export const nivelFromApi = (difficulty) => NIVEL_DE_API[difficulty] || "basico";

/* ------------------------------------------------------------
   Actividades: formato del editor (activities-edit) ↔ formato API
   ------------------------------------------------------------
   Editor                       API (type)         config
   trivia[]                     multiple_choice    { options, correctIndex }
   verdaderoFalso[]             true_false         { correctAnswer }
   order[]  (en orden correcto) ordering           { items, correctOrder }
   mindMap[] ({a, b})           matching           { pairs: [{left, right}] }
   detective                    — (el backend aún no lo soporta)
   ------------------------------------------------------------ */
const PUNTOS_POR_ACTIVIDAD = 10;
const texto = (v) => String(v ?? "").trim();

/**
 * Convierte las actividades del editor al arreglo que espera el API.
 * Ignora entradas incompletas y avisa de lo que no se pudo enviar.
 * @returns {{ activities: object[], warnings: string[] }}
 */
export function activitiesToApi(editor = {}) {
  const activities = [];
  const warnings = [];

  (editor.trivia || []).forEach((q, i) => {
    const opciones = (q.opciones || []).map(texto);
    const validas = opciones.filter(Boolean);
    const correctaTexto = opciones[q.correcta];
    if (!texto(q.pregunta) || validas.length < 2 || !correctaTexto) {
      warnings.push(`Pregunta ${i + 1} incompleta: no se guardó.`);
      return;
    }
    activities.push({
      id: `trivia-${i + 1}`,
      type: "multiple_choice",
      prompt: texto(q.pregunta),
      points: PUNTOS_POR_ACTIVIDAD,
      config: { options: validas, correctIndex: validas.indexOf(correctaTexto) },
    });
  });

  (editor.verdaderoFalso || []).forEach((v, i) => {
    if (!texto(v.afirmacion)) {
      warnings.push(`Afirmación ${i + 1} vacía: no se guardó.`);
      return;
    }
    activities.push({
      id: `vf-${i + 1}`,
      type: "true_false",
      prompt: texto(v.afirmacion),
      points: PUNTOS_POR_ACTIVIDAD,
      config: { correctAnswer: v.respuesta === true },
    });
  });

  const eventos = (editor.order || []).map(texto).filter(Boolean);
  if (eventos.length >= 2) {
    activities.push({
      id: "order-1",
      type: "ordering",
      prompt: "Ordena los hechos de la historia.",
      points: PUNTOS_POR_ACTIVIDAD,
      config: { items: eventos, correctOrder: eventos.map((_, i) => i) },
    });
  } else if ((editor.order || []).some((e) => texto(e))) {
    warnings.push("Ordena la historia necesita al menos 2 eventos: no se guardó.");
  }

  const parejas = (editor.mindMap || [])
    .map((p) => ({ left: texto(p.a), right: texto(p.b) }))
    .filter((p) => p.left && p.right);
  if (parejas.length >= 2) {
    activities.push({
      id: "matching-1",
      type: "matching",
      prompt: "Relaciona cada concepto con su pareja.",
      points: PUNTOS_POR_ACTIVIDAD,
      config: { pairs: parejas },
    });
  } else if ((editor.mindMap || []).some((p) => texto(p.a) || texto(p.b))) {
    warnings.push("Mapa mental necesita al menos 2 parejas completas: no se guardó.");
  }

  const det = editor.detective || {};
  if (texto(det.target) && (det.synonyms || []).length >= 1) {
    activities.push({
      id: "detective-1",
      type: "detective",
      prompt: det.target,
      points: PUNTOS_POR_ACTIVIDAD,
      config: {
        target: det.target,
        synonyms: (det.synonyms || []).map(texto).filter(Boolean),
        distractors: (det.distractors || []).map(texto).filter(Boolean)
      }
    });
  } else if (texto(det.target) || (det.synonyms || []).some(texto) || (det.distractors || []).some(texto)) {
    warnings.push("Detective de palabras incompleto: necesita objetivo y al menos un sinónimo.");
  }

  return { activities, warnings };
}

/**
 * Convierte las actividades del API al formato del editor.
 */
export function activitiesFromApi(list = []) {
  const editor = {
    trivia: [],
    verdaderoFalso: [],
    detective: { target: "", synonyms: [], distractors: [] },
    order: [],
    mindMap: [],
  };

  for (const a of list) {
    const c = a.config || {};
    if (a.type === "multiple_choice") {
      const opciones = [...(c.options || [])];
      while (opciones.length < 4) opciones.push("");
      editor.trivia.push({
        pregunta: a.prompt,
        opciones,
        correcta: c.correctIndex ?? 0,
      });
    } else if (a.type === "true_false") {
      editor.verdaderoFalso.push({
        afirmacion: a.prompt,
        respuesta: c.correctAnswer === true,
      });
    } else if (a.type === "ordering") {
      const orden = c.correctOrder || (c.items || []).map((_, i) => i);
      editor.order = orden.map((i) => c.items[i]);
    } else if (a.type === "matching") {
      editor.mindMap = (c.pairs || []).map((p) => ({ a: p.left, b: p.right }));
    } else if (a.type === "detective") {
      editor.detective = {
        target: c.target || "",
        synonyms: c.synonyms || [],
        distractors: c.distractors || []
      };
    }
  }

  /* El editor siempre necesita al menos una fila vacía por sección */
  if (!editor.trivia.length) editor.trivia.push({ pregunta: "", opciones: ["", "", "", ""], correcta: 0 });
  if (!editor.verdaderoFalso.length) editor.verdaderoFalso.push({ afirmacion: "", respuesta: true });
  if (!editor.order.length) editor.order = ["", "", "", ""];
  if (!editor.mindMap.length) editor.mindMap.push({ a: "", b: "" });
  return editor;
}

/* ------------------------------------------------------------
   Llamadas al backend
   ------------------------------------------------------------ */
export const teacherReadingService = {
  /**
   * Crea una lectura (queda en 'draft').
   * @param {{title, summary, content, nivel, estimatedMinutes, activities?}} data
   */
  async create({ title, summary, content, nivel, estimatedMinutes, activities = [] }) {
    return api.post("/readings", {
      title,
      summary,
      content,
      difficulty: nivelToApi(nivel),
      estimatedMinutes: Math.max(1, Math.round(Number(estimatedMinutes) || 1)),
      activities,
    });
  },

  /**
   * Edita campos de una lectura. Solo se envían los que vienen definidos.
   */
  async update(id, { title, summary, content, nivel, estimatedMinutes, activities }) {
    const body = {};
    if (title !== undefined) body.title = title;
    if (summary !== undefined) body.summary = summary;
    if (content !== undefined) body.content = content;
    if (nivel !== undefined) body.difficulty = nivelToApi(nivel);
    if (estimatedMinutes !== undefined) {
      body.estimatedMinutes = Math.max(1, Math.round(Number(estimatedMinutes) || 1));
    }
    if (activities !== undefined) body.activities = activities;
    return api.patch(`/readings/${id}`, body);
  },

  /** draft → published (el backend exige al menos una actividad). */
  async publish(id) {
    return api.post(`/readings/${id}/publish`);
  },

  /** Detalle completo (incluye actividades). */
  async getById(id) {
    return api.get(`/readings/${id}`);
  },

  /** Lecturas publicadas de la institución (el API no lista borradores). */
  async listPublished({ page = 1, limit = 50 } = {}) {
    const params = new URLSearchParams({ page, limit });
    return api.get(`/readings?${params.toString()}`);
  },
};
