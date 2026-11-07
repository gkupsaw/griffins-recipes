import { UserDAO } from "@/app/datastore/user/cognito";
import {
  extractSessionRecipe,
  loadSessionRecipe,
  SessionRecipeData,
} from "./local_storage_data";
import {
  extractUrlRecipe,
  loadRemoteRecipe,
  UrlRecipeParams,
} from "./remote_storage_data";
import { RecipeData } from "@/app/types/recipe/data";
import { RecipeMetaData } from "@/app/types/recipe/metadata";
import { extractStaticRecipe, StaticRecipeParams } from "./static_data";

export async function loadRecipe(
  recipeState: RecipeData,
  recipeMetaData: RecipeMetaData,
  setUser: (user: Awaited<ReturnType<typeof UserDAO.getCurrentUser>>) => void,
  setRecipeState: (value: RecipeData) => void,
  setRecipeMetaData: (value: RecipeMetaData) => void,
  setRecipeImage: (value: File | string | null) => void,
  setIsLocalStorageLoaded: (value: boolean) => void,
): Promise<void> {
  const currentUser = await UserDAO.getCurrentUser();
  setUser(currentUser);

  if (UserDAO.isAuthenticated(currentUser)) {
    const sessionRecipe = await extractSessionRecipe(
      recipeState.recipeName,
      recipeState.recipeDesc,
      recipeState.recipeDateMilliseconds,
      recipeState.recipeSteps,
      recipeState.recipeIngredients,
      recipeMetaData.recipeAuthor,
      recipeMetaData.isPrivate,
    );
    const urlRecipe = extractUrlRecipe();
    const staticRecipe = extractStaticRecipe();

    const decision = computeStateSourceDecision(
      sessionRecipe,
      urlRecipe,
      staticRecipe,
    );

    console.log(
      `Computed recipe state source decision: ${JSON.stringify(decision)}`,
    );

    switch (decision.verdict) {
      case "UseSessionRecipe":
        loadSessionRecipe(decision.data, setRecipeState, setRecipeMetaData);
        break;
      case "UseUrlRecipe":
        await loadRemoteRecipe(
          decision.data,
          setRecipeState,
          setRecipeMetaData,
          setRecipeImage,
        );
        break;
      case "UseStaticRecipe":
        setRecipeState({
          recipeName: decision.data.recipeName,
          recipeDesc: "",
          recipeDateMilliseconds: Date.now(),
          recipeIngredients: decision.data.recipeIngredients,
          recipeSteps: decision.data.recipeSteps,
        });
        setRecipeMetaData({
          recipeAuthor: null,
          isPrivate: false,
        });
        break;
      case "NoDataAvailable":
        console.log("No recipe data available from any source");
        break;
    }

    setIsLocalStorageLoaded(true);
  }
}

type StateConflictDecision =
  | { verdict: "NoDataAvailable" }
  | { verdict: "UseSessionRecipe"; data: SessionRecipeData }
  | { verdict: "UseUrlRecipe"; data: UrlRecipeParams }
  | { verdict: "UseStaticRecipe"; data: StaticRecipeParams };

function computeStateSourceDecision(
  sessionRecipe: SessionRecipeData | null,
  urlRecipe: UrlRecipeParams | null,
  staticRecipe: StaticRecipeParams | null,
): StateConflictDecision {
  const hasSessionRecipe = sessionRecipe !== null;
  const hasUrlRecipe = urlRecipe !== null;
  const hasStaticRecipe = staticRecipe !== null;

  // Session data is the most critical as it is unrecoverable, check it first.
  if (hasSessionRecipe) {
    if (!hasUrlRecipe && !hasStaticRecipe) {
      // If only session data is available, use it.
      return { verdict: "UseSessionRecipe", data: sessionRecipe };
    } else if (
      sessionRecipe.data.recipeName === urlRecipe?.recipeDirName ||
      sessionRecipe.data.recipeName === staticRecipe?.recipeName
    ) {
      // If the session data is for the same recipe as the URL recipe, assume that the user wants to continue where they left off.
      return { verdict: "UseSessionRecipe", data: sessionRecipe };
    }

    // Otherwise, explicitly request confirmation before moving on, as any other source will clear session data.
    const prompt = `It looks like you were editing the recipe "${sessionRecipe.data.recipeName}" in a previous session. Would you like to clear your work so that you can edit "${staticRecipe?.recipeName ?? urlRecipe?.recipeDirName}" instead? Enter "clear" if so.`;
    if (!["clear"].includes(window.prompt(prompt) ?? "")) {
      return { verdict: "UseSessionRecipe", data: sessionRecipe };
    }
  }

  if (hasStaticRecipe) {
    // Explicit recipe values trump pulling in a remote one for editing.
    return { verdict: "UseStaticRecipe", data: staticRecipe };
  } else if (hasUrlRecipe) {
    return { verdict: "UseUrlRecipe", data: urlRecipe };
  }

  return { verdict: "NoDataAvailable" };
}
