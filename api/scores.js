const memoryStore = globalThis.__ltdScores ?? new Map();
globalThis.__ltdScores = memoryStore;

const MAX_SCORES = 25;
const MAX_SCORE = 9999;

function cleanRoom(room) {
  return String(room || "ltd").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "ltd";
}

function cleanName(name) {
  return String(name || "Jugador LTD").trim().replace(/\s+/g, " ").slice(0, 24) || "Jugador LTD";
}

function canUseKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(command) {
  const response = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error("KV request failed");
  }

  return response.json();
}

function normalizeEntry(entry) {
  return {
    id: String(entry.id || crypto.randomUUID()),
    name: cleanName(entry.name),
    score: Number.isFinite(Number(entry.score)) ? Number(entry.score) : 0,
    rounds: Number.isFinite(Number(entry.rounds)) ? Number(entry.rounds) : 12,
    createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : Date.now()
  };
}

function sortScores(scores) {
  return scores
    .map(normalizeEntry)
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .slice(0, MAX_SCORES);
}

async function readScores(room) {
  if (canUseKv()) {
    const payload = await kvCommand(["GET", `scores:${room}`]);
    const rawScores = typeof payload.result === "string" ? JSON.parse(payload.result) : payload.result;
    return sortScores(Array.isArray(rawScores) ? rawScores : []);
  }

  return sortScores(memoryStore.get(room) ?? []);
}

async function writeScores(room, entry) {
  const nextScores = sortScores([...(await readScores(room)), entry]);

  if (canUseKv()) {
    await kvCommand(["SET", `scores:${room}`, JSON.stringify(nextScores)]);
  } else {
    memoryStore.set(room, nextScores);
  }

  return nextScores;
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    return response.status(204).end();
  }

  try {
    if (request.method === "GET") {
      const room = cleanRoom(request.query.room);
      const scores = await readScores(room);
      return response.status(200).json({ scores });
    }

    if (request.method === "POST") {
      const room = cleanRoom(request.body?.room);
      const score = Math.max(0, Math.min(MAX_SCORE, Number(request.body?.score) || 0));
      const entry = normalizeEntry({
        id: crypto.randomUUID(),
        name: request.body?.name,
        score,
        rounds: request.body?.rounds,
        createdAt: Date.now()
      });
      const scores = await writeScores(room, entry);
      return response.status(201).json({ scores });
    }

    return response.status(405).json({ error: "Method not allowed" });
  } catch {
    return response.status(500).json({ error: "Could not load scores" });
  }
}
