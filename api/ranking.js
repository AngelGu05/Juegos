// Ranking del analista para la Casa de Subasta (función de Vercel).
// Necesita la variable de entorno ANTHROPIC_API_KEY configurada en el proyecto de Vercel.
import Anthropic from "@anthropic-ai/sdk";

const SCHEMA = {
  type: "object",
  properties: {
    ranking: {
      type: "array",
      items: {
        type: "object",
        properties: {
          postor: { type: "string" },
          puesto: { type: "integer" },
          nota: { type: "number" },
          comentario: { type: "string" },
        },
        required: ["postor", "puesto", "nota", "comentario"],
        additionalProperties: false,
      },
    },
    resumen: { type: "string" },
  },
  required: ["ranking", "resumen"],
  additionalProperties: false,
};

const clip = (v, n = 80) => String(v ?? "").slice(0, n);

// Solo se aceptan los datos de los equipos; el texto de la petición lo arma el servidor.
function clean(body) {
  const deporte = body?.deporte === "básquetbol (NBA)" ? "básquetbol (NBA)" : "fútbol";
  const unidad = deporte === "fútbol" ? "once titular" : "quinteto titular";
  const equipos = (Array.isArray(body?.equipos) ? body.equipos : []).slice(0, 16).map((e) => ({
    postor: clip(e?.postor, 40),
    efectivo: Math.max(0, Math.round(Number(e?.efectivo) || 0)),
    jugadores: (Array.isArray(e?.jugadores) ? e.jugadores : []).slice(0, 60).map((j) => ({
      nombre: clip(j?.nombre),
      posicion: clip(j?.posicion, 20),
      equipo: clip(j?.equipo, 40),
      leyenda: !!j?.leyenda,
    })),
  }));
  return { deporte, unidad, equipos };
}

function prompt(d) {
  const teams = d.equipos
    .map((e) => `- ${e.postor} (efectivo sobrante $${e.efectivo}): ${e.jugadores.length ? e.jugadores.map((j) => `${j.nombre} [${j.posicion}, ${j.equipo}${j.leyenda ? ", leyenda" : ""}]`).join("; ") : "sin jugadores"}`)
    .join("\n");
  return `Eres el analista experto de una subasta de ${d.deporte}. Cada postor armó un equipo comprando jugadores reales (algunos son leyendas históricas, evalúalos en su mejor momento). Decide qué equipo es mejor para competir según: calidad de los jugadores, equilibrio por posiciones, si alcanza para un ${d.unidad} competitivo, profundidad de banca y química. Un equipo sin jugadores va último.

Equipos:
${teams}

Incluye a todos los postores con su nombre exacto, puestos del 1 al ${d.equipos.length} sin empates, nota de 0 a 10 con un decimal, comentario en español de máximo 2 frases y un resumen de 1-2 frases.`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ code: "no_key" });

  const data = clean(typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body);
  if (data.equipos.length < 2) return res.status(400).json({ code: "bad_request" });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: prompt(data) }],
    });
    if (response.stop_reason === "refusal") return res.status(502).json({ code: "server" });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ code: "rate_limited" });
    if (err instanceof Anthropic.AuthenticationError) return res.status(503).json({ code: "no_key" });
    if (err instanceof SyntaxError) return res.status(502).json({ code: "invalid_json" });
    console.error(err);
    return res.status(502).json({ code: "server" });
  }
}
