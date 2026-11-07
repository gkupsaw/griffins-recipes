export type StaticRecipeParams = {
  recipeName: string;
  recipeIngredients: string[];
  recipeSteps: string[];
};

function parseListParam(param: string | null): any[] {
  if (param === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(param);
    if (!Array.isArray(parsed)) {
      console.warn(`Parsed param is not a list: ${param}`);
      return [];
    }

    return parsed;
  } catch (e) {
    console.warn(`Could not parse: ${param}`);
    return [];
  }
}

export function extractStaticRecipe(): StaticRecipeParams | null {
  const searchParams = new URLSearchParams(document.location.search);

  const recipeNameParam = searchParams.get("staticrecipename");
  const recipeIngredientsParam = searchParams.get("staticrecipeingredients");
  const recipeStepsParam = searchParams.get("staticrecipesteps");

  if (
    recipeNameParam === null &&
    recipeIngredientsParam === null &&
    recipeStepsParam === null
  ) {
    console.log("No static recipe params found in URL");
    return null;
  }

  const recipeName = recipeNameParam ?? "";
  const recipeIngredients = parseListParam(recipeIngredientsParam);
  const recipeSteps = parseListParam(recipeStepsParam);

  console.log("Found static recipe params in URL");
  return { recipeName, recipeIngredients, recipeSteps };
}
