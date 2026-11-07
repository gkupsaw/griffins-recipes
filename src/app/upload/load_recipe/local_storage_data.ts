import { RecipeData } from "../../types/recipe/data";
import { RecipeMetaData } from "../../types/recipe/metadata";

export type SessionRecipeData = {
  data: RecipeData;
  metadata: RecipeMetaData;
};

export async function extractSessionRecipe(
  recipeName: RecipeData["recipeName"],
  recipeDesc: RecipeData["recipeDesc"],
  recipeDateMilliseconds: RecipeData["recipeDateMilliseconds"],
  recipeSteps: RecipeData["recipeSteps"],
  recipeIngredients: RecipeData["recipeIngredients"],
  recipeAuthor: RecipeMetaData["recipeAuthor"],
  isPrivate: RecipeMetaData["isPrivate"],
): Promise<SessionRecipeData | null> {
  const inProgressRecipe = localStorage.getItem("in-progress-recipe");
  if (inProgressRecipe !== null) {
    console.log(`In progress recipe data found: ${inProgressRecipe}`);
    try {
      const inProgressRecipeResult: SessionRecipeData =
        JSON.parse(inProgressRecipe);

      const { data: inProgressRecipeData, metadata: inProgressRecipeMetaData } =
        inProgressRecipeResult;
      if (
        [
          inProgressRecipeData.recipeName,
          inProgressRecipeData.recipeDesc,
          ...inProgressRecipeData.recipeIngredients,
          ...inProgressRecipeData.recipeSteps,
        ].some((s) => s.length !== 0)
      ) {
        return {
          data: {
            recipeName: inProgressRecipeData.recipeName ?? recipeName,
            recipeDesc: inProgressRecipeData.recipeDesc ?? recipeDesc,
            recipeDateMilliseconds:
              inProgressRecipeData.recipeDateMilliseconds ??
              recipeDateMilliseconds,
            recipeIngredients:
              inProgressRecipeData.recipeIngredients ?? recipeIngredients,
            recipeSteps: inProgressRecipeData.recipeSteps ?? recipeSteps,
          },
          metadata: {
            isPrivate: inProgressRecipeMetaData.isPrivate ?? isPrivate,
            recipeAuthor: inProgressRecipeMetaData.recipeAuthor ?? recipeAuthor,
          },
        };
      }
    } catch (e) {
      console.warn(`Could not parse in progress recipe data: ${e}`);
    }
  }
  return null;
}

export function loadSessionRecipe(
  sessionRecipe: SessionRecipeData,
  setRecipeState: (recipeState: RecipeData) => void,
  setRecipeMetaData: (recipeMetaData: RecipeMetaData) => void,
): void {
  window.alert(
    `Loading input from previous session${sessionRecipe.data.recipeName ? `for recipe "${sessionRecipe.data.recipeName}"` : ""}.`,
  );
  setRecipeState(sessionRecipe.data);
  setRecipeMetaData(sessionRecipe.metadata);
}
