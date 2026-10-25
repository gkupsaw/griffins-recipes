// worker.ts — Cloudflare Worker: fetch a recipe URL and return { name, ingredients, steps }.
// Uses schema.org Recipe JSON-LD when present; otherwise returns trimmed page text for an AI fallback.

export interface Env {
  /** Your site's origin, e.g. "https://recipes.example.com". Defaults to "*" (fine for testing only). */
  ALLOWED_ORIGIN?: string;
}

interface Recipe {
  name: string;
  ingredients: string[];
  steps: string[];
}

type ApiResponse =
  | { source: "jsonld"; recipe: Recipe }
  | { source: "text"; text: string }
  | { error: string };

const MAX_HTML_CHARS = 1_000_000; // keeps CPU use low on the free plan
const MAX_TEXT_CHARS = 15_000; // what we hand to the AI fallback
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/;

// ---------- helpers ----------

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));

function toStrings(x: unknown): string[] {
  return ([] as unknown[])
    .concat(x ?? [])
    .filter((v): v is string => typeof v === "string");
}

/** Depth-first search for a node whose @type includes "Recipe" (handles arrays and @graph). */
function findRecipe(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(node)) return null;
  const types = ([] as unknown[]).concat(node["@type"] ?? []);
  return types.includes("Recipe") ? node : findRecipe(node["@graph"]);
}

/** recipeInstructions can be a string, string[], HowToStep[], or HowToSection[]. */
function flattenSteps(x: unknown): string[] {
  if (typeof x === "string")
    return x
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  if (Array.isArray(x)) return x.flatMap(flattenSteps);
  if (isRecord(x)) return flattenSteps(x.itemListElement ?? x.text ?? x.name);
  return [];
}

function extractRecipe(html: string): Recipe | null {
  const scripts = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, body] of scripts) {
    try {
      const recipe = findRecipe(JSON.parse(body));
      if (recipe) {
        return {
          name: decodeEntities(String(recipe.name ?? "")),
          ingredients: toStrings(recipe.recipeIngredient).map(decodeEntities),
          steps: flattenSteps(recipe.recipeInstructions).map(decodeEntities),
        };
      }
    } catch {
      // malformed JSON-LD block; try the next one
    }
  }
  return null;
}

function extractText(html: string): string {
  const stripped = html
    .replace(
      /<(script|style|noscript|svg|nav|header|footer)[\s\S]*?<\/\1>/gi,
      " ",
    )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeEntities(stripped).slice(0, MAX_TEXT_CHARS);
}

function parseTarget(raw: string | null): URL | null {
  try {
    const url = new URL(raw ?? "");
    const ok =
      /^https?:$/.test(url.protocol) && !PRIVATE_HOST.test(url.hostname);
    return ok ? url : null;
  } catch {
    return null;
  }
}

// ---------- handler ----------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN ?? "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json",
    };
    const reply = (body: ApiResponse, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });

    if (request.method === "OPTIONS") return new Response(null, { headers });

    const target = parseTarget(new URL(request.url).searchParams.get("url"));
    if (!target) return reply({ error: "Invalid or disallowed URL" }, 400);

    let res: Response;
    try {
      res = await fetch(target, {
        headers: BROWSER_HEADERS,
        redirect: "follow",
      });
    } catch {
      return reply({ error: "Fetch failed" }, 502);
    }
    if (!res.ok) return reply({ error: `Site returned ${res.status}` }, 502);

    const html = (await res.text()).slice(0, MAX_HTML_CHARS);
    const recipe = extractRecipe(html);
    return recipe
      ? reply({ source: "jsonld", recipe })
      : reply({ source: "text", text: extractText(html) });
  },
} satisfies ExportedHandler<Env>;
