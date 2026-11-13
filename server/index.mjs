#!/usr/bin/env node
// Mini-serveur API du chatbot portfolio — zéro dépendance (Node >= 18).
//
// Rôles :
//  - garder la clé API OpenAI côté serveur (server/.env), jamais dans le bundle front ;
//  - faire la recherche RAG sur les fiches projets de server/rag/*.md
//    (embeddings text-embedding-3-small + similarité cosinus, cf. PFE Memory) ;
//  - n'apprêter qu'un endpoint /api/chat qui renvoie UNE réponse (texte) au front.
//
// Lancement : `bun run server` ou `node server/index.mjs`

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Chargement du .env (clé API, config) — sans dotenv, parseur minimal.
// Les variables déjà présentes dans l'environnement gardent la priorité.
// ---------------------------------------------------------------------------
async function loadEnvFile(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, name, value] = match;
      if (!(name in process.env)) {
        process.env[name] = value.replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // pas de .env : on s'en remet aux variables d'environnement
  }
}

await loadEnvFile(SERVER_DIR);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CONFIG = {
  port: Number(process.env.PORT) || 8787,
  apiKey: process.env.OPENAI_API_KEY || '',
  model: process.env.OPENAI_MODEL || 'gpt-4.1',
  embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  ragDir: process.env.RAG_DIR || path.join(SERVER_DIR, 'rag'),
  topK: Number(process.env.RAG_TOP_K) || 4,
  minScore: Number(process.env.RAG_MIN_SCORE) || 0.3, // seuil témoin (logs)
  maxTokens: Number(process.env.MAX_TOKENS) || 600,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 30, // requêtes / IP
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
};

const OPENAI_CHAT_URL = "https://api.mammouth.ai/v1/chat/completions";
const OPENAI_EMBED_URL = 'https://api.mammouth.ai/v1/embeddings';

// ---------------------------------------------------------------------------
// Ingestion RAG : lecture des .md, découpage par sections, embeddings.
// ---------------------------------------------------------------------------
function log(...args) {
  console.log(`[chatbot-server ${new Date().toISOString()}]`, ...args);
}

// Découpe un document markdown en morceaux cohérents : le titre global `#`,
// puis chaque section `##`. Préfixe chaque morceau par le titre du document
// pour que l'embedding reflète le contexte (ex. "Memory : ...").
function chunkDocument(content, fileName) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const docTitle = titleMatch ? titleMatch[1].trim() : fileName.replace(/\.md$/, '');

  const sections = content.split(/\n(?=##)/g).map((s) => s.trim()).filter(Boolean);
  const chunks = [];
  for (const section of sections) {
    const text = section.replace(/\n{3,}/g, '\n\n');
    if (!text) continue;
    chunks.push({ fileName, text: `${docTitle}\n\n${text}` });
  }
  return chunks;
}

// cosine(a, b) — les embeddings OpenAI sont déjà normalisés, mais on calcule
// correctement pour ne rien supposer.
function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

const ragState = { chunks: [], vectors: [], status: 'pending', error: null };

async function embedBatch(inputs, apiKey) {
  const res = await fetch(OPENAI_EMBED_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: CONFIG.embeddingModel, input: inputs }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Erreur embeddings (${res.status}) : ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data.map((item) => item.embedding);
}

async function initRag() {
  if (!CONFIG.apiKey) {
    ragState.status = 'disabled';
    ragState.error = 'OPENAI_API_KEY manquante (server/.env) : RAG et /api/chat indisponibles.';
    return;
  }
  try {
    const files = (await fs.readdir(CONFIG.ragDir)).filter((f) => f.endsWith('.md')).sort();
    if (files.length === 0) {
      ragState.status = 'empty';
      ragState.error = `Aucun fichier .md dans ${CONFIG.ragDir}`;
      return;
    }

    ragState.chunks = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(CONFIG.ragDir, file), 'utf8');
      ragState.chunks.push(...chunkDocument(content, file));
    }

    const started = Date.now();
    ragState.vectors = await embedBatch(ragState.chunks.map((c) => c.text), CONFIG.apiKey);
    ragState.status = 'ready';
    ragState.error = null;
    log(`RAG prêt : ${files.length} fichier(s), ${ragState.chunks.length} morceaux, embeddings en ${Date.now() - started} ms.`);
  } catch (err) {
    ragState.status = 'error';
    ragState.error = err.message;
    log('Erreur init RAG :', err.message);
  }
}

// Retourne les top-k morceaux les plus proches de la question.
async function retrieve(question) {
  if (ragState.status !== 'ready') return [];
  const [queryVector] = await embedBatch([question], CONFIG.apiKey);
  const scored = ragState.chunks.map((chunk, i) => ({
    ...chunk,
    score: cosine(queryVector, ragState.vectors[i]),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, CONFIG.topK);
}

// ---------------------------------------------------------------------------
// Prompt système : cadre la conversation sur le portfolio et sa base RAG.
// ---------------------------------------------------------------------------
function buildSystemPrompt(contextChunks) {
  const context = contextChunks.length
    ? contextChunks
        .map((c) => `[${c.fileName}]\n${c.text}`)
        .join('\n\n---\n\n')
    : '(aucun extrait disponible)';

  return `Tu es l'assistant du portfolio d'Eldoliprano (Baptiste Le Bail), développeur.
Le portfolio est une scène 3D interactive ; chaque projet y est présenté sous forme de case (FlappyIa, Memory, Sentillement, Curation) ; on y trouve aussi des cases CV, LinkedIn et GitHub, et on navigue entre les cases avec des flèches.

Ton périmètre est STRICT : tu réponds uniquement aux questions portant sur le portfolio, les projets qui y sont présentés, le parcours de Baptiste et les technologies utilisées dans ces projets.
- Pour toute question hors de ce périmètre (actualité, code général, cours, culture générale...), dis brièvement et avec gentillesse que tu es là pour parler du portfolio, sans répondre au fond.
- Pour les faits concernant les projets et le parcours, appuie-toi UNIQUEMENT sur les extraits de fiches fournis ci-dessous. Si l'information n'y figure pas, dis simplement que tu ne peux pas répondre faute d'information, sans inventer.
- Réponds en français, de manière concise, amicale et naturelle.

Extraits des fiches projets les plus pertinents pour la question :
---
${context}
---`;
}

// ---------------------------------------------------------------------------
// OpenAI : complétion de chat.
// ---------------------------------------------------------------------------
async function chatCompletion(messages) {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.model,
      messages,
      max_tokens: CONFIG.maxTokens,
      temperature: 0.6,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Erreur OpenAI (${res.status}) : ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return {
    reply: data.choices?.[0]?.message?.content ?? 'Pas de réponse.',
    usage: data.usage,
  };
}

// ---------------------------------------------------------------------------
// Limiteur de débit simple (fenêtre fixe par IP) : garde-fou pour que votre
// clé API ne coûte pas plus cher que prévu sur un site public.
// ---------------------------------------------------------------------------
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) ?? { count: 0, resetAt: now + CONFIG.rateLimitWindowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + CONFIG.rateLimitWindowMs;
  }
  bucket.count += 1;
  rateBuckets.set(ip, bucket);
  return bucket.count > CONFIG.rateLimitMax;
}

// ---------------------------------------------------------------------------
// Serveur HTTP
// ---------------------------------------------------------------------------
async function readJsonBody(req, maxBytes = 20_000) {
  const buffers = [];
  let size = 0;
  for await (const buf of req) {
    size += buf.length;
    if (size > maxBytes) throw new Error('Corps de requête trop volumineux.');
    buffers.push(buf);
  }
  if (size === 0) return {};
  return JSON.parse(Buffer.concat(buffers).toString('utf8'));
}

async function handleChat(req, res) {
  const body = await readJsonBody(req);
  const history = Array.isArray(body.messages) ? body.messages : [];

  // On borne l'historique côté serveur : les 12 derniers messages, des rôles
  // connus, des textes plafonnés. Le dernier message utilisateur sert de
  // requête de recherche RAG.
  const clean = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4_000) }))
    .slice(-12);

  const lastUser = [...clean].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Aucun message utilisateur.' }));
    return;
  }

  if (ragState.status !== 'ready') {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Base RAG indisponible : ${ragState.error ?? ragState.status}` }));
    return;
  }

  const question = lastUser.content;
  const chunks = await retrieve(question);
  chunks.forEach((c) => log(`extrait: ${c.fileName} (score ${c.score.toFixed(3)})`));
  const belowThreshold = chunks.length === 0 || chunks[0].score < CONFIG.minScore;
  if (belowThreshold) log('score max sous le seuil — réponse possiblement hors périmètre.');

  const messages = [
    { role: 'system', content: buildSystemPrompt(chunks) },
    ...clean,
  ];

  const { reply, usage } = await chatCompletion(messages);
  log(`réponse générée — tokens: ${usage?.total_tokens ?? '?'}`);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ reply, score: chunks[0]?.score ?? 0 }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const ip = req.socket.remoteAddress ?? '?';

  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    if (url.pathname === '/api/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        rag: ragState.status,
        model: CONFIG.model,
      }));
      return;
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      if (isRateLimited(ip)) {
        log(`limite de débit atteinte pour ${ip}`);
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Trop de messages envoyés, réessaie dans un instant.' }));
        return;
      }
      await handleChat(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route inconnue.' }));
  } catch (err) {
    log(`Erreur ${req.method} ${url.pathname} :`, err.message);
    res.writeHead(err instanceof SyntaxError ? 400 : 500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message.slice(0, 300) }));
  }
});

await initRag();
server.listen(CONFIG.port, () => {
  log(`Serveur démarré sur http://localhost:${CONFIG.port}`);
  log(`Clé API : ${CONFIG.apiKey ? 'présente ✓' : 'ABSENTE — renseigne OPENAI_API_KEY dans server/.env'}`);
});
