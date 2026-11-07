import { RecipeDataDAO } from "../../datastore/recipe/data";
import { RecipeImageDAO } from "../../datastore/recipe/image";
import { RecipeMetaDataDAO } from "../../datastore/recipe/metadata";
import { RecipeData } from "../../types/recipe/data";
import { RecipeMetaData } from "../../types/recipe/metadata";
import { Alert } from "./alerts";

export type UrlRecipeParams = {
  recipeDirName: string;
  privateParam: boolean;
};
export function extractUrlRecipe(): UrlRecipeParams | null {
  const searchParams = new URLSearchParams(document.location.search);
  const recipeDirName = searchParams.get("recipename");
  const privateParam = searchParams.get("private") === "true";

  if (recipeDirName === null) {
    console.log("No recipe params in URL");
    return null;
  }

  console.log("Found recipe params in URL");
  return { recipeDirName, privateParam };
}

export async function loadRemoteRecipe(
  params: UrlRecipeParams,
  setRecipeState: (recipeState: RecipeData) => void,
  setRecipeMetaData: (recipeMetaData: RecipeMetaData) => void,
  setRecipeImage: (recipeImage: File | string | null) => void,
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const { recipeDirName, privateParam } = params;

  await RecipeDataDAO.get(recipeDirName, privateParam)
    .then(setRecipeState)
    .catch((e) => {
      console.warn(e);
      alerts.push({
        type: "ERROR",
        message: `We couldn't load your recipe data`,
      });
    });

  await RecipeMetaDataDAO.get(recipeDirName, privateParam)
    .then(setRecipeMetaData)
    .catch((e) => {
      console.warn(e);
      alerts.push({
        type: "ERROR",
        message: `We couldn't load your recipe metadata`,
      });
    });

  await RecipeImageDAO.getUrl(recipeDirName, privateParam)
    .then(setRecipeImage)
    .catch((e) => {
      console.warn(e);
      setRecipeImage(null);
    });

  return alerts;
}
