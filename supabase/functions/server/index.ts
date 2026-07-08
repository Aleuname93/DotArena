import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/server/health", (c) => {
  return c.json({ status: "ok" });
});

interface PlayerStats {
  playerId: string
  name: string
  wins: number
  losses: number
  draws: number
  lastSeen: string
}

app.post("/server/stats", async (c) => {
  const body = await c.req.json();
  const { playerId, name, result } = body as { playerId: string; name: string; result: 'win' | 'loss' | 'draw' };

  if (!playerId || !result) {
    return c.json({ error: "playerId e result são obrigatórios" }, 400);
  }

  const key = `stats:${playerId}`;
  const existing: PlayerStats | undefined = await kv.get(key);

  const updated: PlayerStats = {
    playerId,
    name: name ?? existing?.name ?? 'JOGADOR',
    wins: (existing?.wins ?? 0) + (result === 'win' ? 1 : 0),
    losses: (existing?.losses ?? 0) + (result === 'loss' ? 1 : 0),
    draws: (existing?.draws ?? 0) + (result === 'draw' ? 1 : 0),
    lastSeen: new Date().toISOString(),
  };

  await kv.set(key, updated);
  return c.json(updated);
});

app.get("/server/stats/:id", async (c) => {
  const playerId = c.req.param('id');
  const stats = await kv.get(`stats:${playerId}`);
  if (!stats) return c.json({ error: "not found" }, 404);
  return c.json(stats);
});

app.get("/server/leaderboard", async (c) => {
  const all: PlayerStats[] = await kv.getByPrefix('stats:');
  const sorted = all.sort((a, b) => b.wins - a.wins).slice(0, 50);
  return c.json(sorted);
});

Deno.serve(app.fetch);
