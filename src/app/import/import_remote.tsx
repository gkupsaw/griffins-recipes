import type { RecipeData } from "../types/recipe/data";

// What the import fills in; description, author, date and image stay manual.
export type ImportedRecipe = Pick<
  RecipeData,
  "recipeName" | "recipeIngredients" | "recipeSteps"
>;

type WorkerResponse =
  | {
      source: "jsonld";
      recipe: { name: string; ingredients: string[]; steps: string[] };
    }
  | { source: "text"; text: string }
  | { error: string };

const IMPORT_URL = process.env.NEXT_PUBLIC_RECIPE_IMPORT_URL ?? "";

// The upload form strips non-ASCII characters on every edit, so imported text
// must already be ASCII or it would be mangled the first time the user types.
const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8",
};
const DECIMAL_FRACTIONS: Record<string, string> = {
  "0.25": "1/4",
  "0.33": "1/3",
  "0.5": "1/2",
  "0.66": "2/3",
  "0.67": "2/3",
  "0.75": "3/4",
};

export function toAscii(input: string): string {
  return input
    .replace(
      /(\d)?\s*([½¼¾⅓⅔⅛])/g,
      (_, whole: string | undefined, f: string) =>
        (whole ? `${whole} ` : "") + UNICODE_FRACTIONS[f],
    )
    .replace(
      /(^|\s)(\d*)\.(\d+)(?=\s|$)/g,
      (m, pre: string, whole: string, dec: string) => {
        const frac = DECIMAL_FRACTIONS[`0.${dec}`];
        if (!frac) return m;
        return pre + (whole && whole !== "0" ? `${whole} ` : "") + frac;
      },
    )
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00B0/g, " degrees ")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const BOILERPLATE_STEP =
  /^(gather (all )?(the )?ingredients|enjoy|serve)[.!]?$/i;
const clean = (lines: string[], skip?: RegExp) =>
  lines.map(toAscii).filter((s) => s.length > 0 && !skip?.test(s));

export async function importRecipeFromLink(
  link: string,
): Promise<ImportedRecipe> {
  if (!IMPORT_URL) throw new Error("NEXT_PUBLIC_RECIPE_IMPORT_URL is not set");

  const res = await fetch(`${IMPORT_URL}?url=${encodeURIComponent(link)}`);
  const data = (await res.json()) as WorkerResponse;

  if ("error" in data) throw new Error(data.error);
  if (data.source === "text") {
    throw new Error(
      "That page has no structured recipe data (AI fallback not set up yet)",
    );
  }

  const { name, ingredients, steps } = data.recipe;
  const recipeIngredients = clean(ingredients);
  const recipeSteps = clean(steps, BOILERPLATE_STEP);

  return {
    // Same sanitization the form applies to recipe names (they double as folder IDs).
    recipeName: toAscii(name).replaceAll(/[\/\n\t\r]/g, ""),
    // Form state expects at least one (possibly empty) entry per list.
    recipeIngredients: recipeIngredients.length ? recipeIngredients : [""],
    recipeSteps: recipeSteps.length ? recipeSteps : [""],
  };
}
