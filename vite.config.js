import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const localScores = new Map();

function sortScores(scores) {
  return scores
    .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
    .slice(0, 25);
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function localScoresApi() {
  return {
    name: "local-scores-api",
    configureServer(server) {
      server.middlewares.use("/api/scores", async (request, response) => {
        const url = new URL(request.url || "", "http://localhost");
        const room = (url.searchParams.get("room") || "ltd").replace(/[^a-z0-9_-]/gi, "") || "ltd";

        response.setHeader("Content-Type", "application/json");

        if (request.method === "GET") {
          response.end(JSON.stringify({ scores: sortScores([...(localScores.get(room) || [])]) }));
          return;
        }

        if (request.method === "POST") {
          const body = await readBody(request);
          const entry = {
            id: crypto.randomUUID(),
            name: String(body.name || "Jugador LTD").trim().slice(0, 24) || "Jugador LTD",
            score: Math.max(0, Math.min(12, Number(body.score) || 0)),
            rounds: Math.max(1, Math.min(12, Number(body.rounds) || 1)),
            createdAt: Date.now()
          };
          const scores = sortScores([...(localScores.get(body.room || room) || []), entry]);
          localScores.set(body.room || room, scores);
          response.statusCode = 201;
          response.end(JSON.stringify({ scores }));
          return;
        }

        response.statusCode = 405;
        response.end(JSON.stringify({ error: "Method not allowed" }));
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), localScoresApi()],
  server: {
    allowedHosts: true
  },
  resolve: {
    alias: {
      "react-native": "react-native-web"
    }
  }
});
