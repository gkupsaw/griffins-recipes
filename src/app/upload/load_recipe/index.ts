import { UserDAO } from "@/app/datastore/user/cognito";
import { extractSessionRecipe, loadSessionRecipe } from "./local_storage";
import { extractUrlRecipe, loadRemoteRecipe } from "./remote_storage";
import { RecipeData } from "@/app/types/recipe/data";
import { RecipeMetaData } from "@/app/types/recipe/metadata";

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

    if (sessionRecipe && !urlRecipe) {
      loadSessionRecipe(sessionRecipe, setRecipeState, setRecipeMetaData);
    } else if (!sessionRecipe && urlRecipe) {
      await loadRemoteRecipe(
        urlRecipe,
        setRecipeState,
        setRecipeMetaData,
        setRecipeImage,
      );
    } else if (sessionRecipe && urlRecipe) {
      if (sessionRecipe.data.recipeName === urlRecipe.recipeDirName) {
        // If the session data is for the same recipe as the URL recipe, assume that the user wants to continue where they left off.
        loadSessionRecipe(sessionRecipe, setRecipeState, setRecipeMetaData);
      } else {
        // Otherwise, explicitly request confirmation before clearing session data.
        const prompt = `It looks like you were editing the recipe "${sessionRecipe.data.recipeName}" in a previous session. Would you like to clear your work so that you can edit "${urlRecipe.recipeDirName}" instead? Enter "clear" if so.`;
        if (["clear"].includes(window.prompt(prompt) ?? "")) {
          await loadRemoteRecipe(
            urlRecipe,
            setRecipeState,
            setRecipeMetaData,
            setRecipeImage,
          );
        } else {
          loadSessionRecipe(sessionRecipe, setRecipeState, setRecipeMetaData);
        }
      }
    }

    setIsLocalStorageLoaded(true);
  }
}
