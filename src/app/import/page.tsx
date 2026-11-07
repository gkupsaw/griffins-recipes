"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { AuthUser } from "aws-amplify/auth";
import { downloadData } from "aws-amplify/storage";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { UserDAO } from "../datastore/user/cognito";
import { TotalRecipeMetaData } from "../types/recipe/metadata";
import { importRecipeFromLink } from "./import_remote";

const gray = {
  primary: "bg-gray-800",
  secondary: "bg-gray-500",
};

const buttonClass = `hover:${gray.secondary} text-white px-2 rounded-xs transition duration-300 ease-in-out`;
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

export default function RecipeForm() {
  const [importLink, setImportLink] = useState("");
  const [importingLink, setImportingLink] = useState(false);

  const [existingPublicRecipes, setExistingPublicRecipes] = useState<
    string[] | null
  >(null);
  const [existingPublicRecipeToImport, setExistingPublicRecipeToImport] =
    useState<string>("");
  const [importingPublic, setImportingPublic] = useState(false);

  const [existingPrivateRecipes, setExistingPrivateRecipes] = useState<
    string[] | null
  >(null);
  const [existingPrivateRecipeToImport, setExistingPrivateRecipeToImport] =
    useState<string>("");
  const [importingPrivate, setImportingPrivate] = useState(false);

  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function loadRecipes(topLevelFolder: string): Promise<string[]> {
      try {
        const existingTotalMetaData: TotalRecipeMetaData = JSON.parse(
          await (
            await downloadData({ path: `${topLevelFolder}/metadata.json` })
              .result
          ).body.text(),
        );
        return Object.keys(existingTotalMetaData);
      } catch (e) {
        window.alert(`Could not load recipes.`);
        console.warn(`Could not load existing recipe metadata: ${e}`);
        return [];
      }
    }

    (async () => {
      const currentUser = await UserDAO.getCurrentUser();
      setUser(currentUser);

      if (UserDAO.isAuthenticated(currentUser)) {
        setExistingPublicRecipes([...(await loadRecipes("recipe-metadata"))]);
        setExistingPrivateRecipes([
          ...(await loadRecipes("private-recipe-metadata")),
        ]);
      }
    })();
  }, []);

  async function handleImportFromLink() {
    setImportingLink(true);

    const searchParams = new URLSearchParams();
    try {
      const imported = await importRecipeFromLink(importLink.trim());

      searchParams.set("staticrecipename", imported.recipeName.trim());
      searchParams.set(
        "staticrecipeingredients",
        JSON.stringify(imported.recipeIngredients),
      );
      searchParams.set(
        "staticrecipesteps",
        JSON.stringify(imported.recipeSteps),
      );
    } catch (e) {
      console.warn(e);
      window.alert(
        `Could not import recipe: ${e instanceof Error ? e.message : e}`,
      );
    } finally {
      setImportingLink(false);
    }

    const url = `upload?${searchParams.toString()}`;
    console.log(`Redirecting to ${url}...`);
    redirect(url);
  }

  function handleImport(
    existingRecipeToImport: string,
    isPrivate: boolean,
    setImporting: (value: boolean) => void,
  ) {
    if (disabled) {
      return console.warn("Operation in progress, cannot import");
    }

    if (existingRecipeToImport.trim() && !disabled) {
      console.log("Starting import workflow...");
      setImporting(true);

      const searchParams = new URLSearchParams();
      searchParams.set("recipename", existingRecipeToImport.trim());
      searchParams.set("private", isPrivate.toString());

      const url = `upload?${searchParams.toString()}`;
      console.log(`Redirecting to ${url}...`);
      redirect(url);
    }
  }

  const disabled = importingLink || importingPublic || importingPrivate;

  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 md:px-[20%]">
      <Authenticator hideSignUp>
        {() => (
          <form className="font-mono flex flex-col gap-[32px] row-start-2 w-full max-w-full">
            <div
              id="Import link"
              className="flex flex-col w-full gap-[2px] row-start-2 items-center"
            >
              <p className="w-full text-xl md:text-3xl text-center text-left">
                Import a recipe from another website
              </p>
              <div className="flex flex-row w-full text-sm/6 text-center text-left">
                <input
                  type="url"
                  className={inputClass}
                  placeholder="Paste a recipe link - if it's compatible, ingredients and steps will be imported automatically"
                  value={importLink}
                  onChange={(e) => setImportLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault(); // Enter would otherwise submit the <form> and reload the page
                      if (importLink.trim() && !disabled)
                        handleImportFromLink();
                    }
                  }}
                  disabled={disabled}
                />
                <button
                  disabled={disabled || !importLink.trim()}
                  className={buttonClass}
                  onClick={(e) => {
                    e.preventDefault();
                    handleImportFromLink();
                  }}
                >
                  {importingLink ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
            <div
              id="Edit"
              className="flex flex-col w-full gap-[2px] row-start-2 items-center"
            >
              <div
                id="Edit title"
                className="flex flex-row w-full items-stretch"
              >
                <p className="flex-grow text-xl md:text-3xl text-center text-left">
                  Edit an existing recipe
                </p>
              </div>
              {[
                {
                  id: "public",
                  existingRecipes: existingPublicRecipes,
                  existingRecipeToImport: existingPublicRecipeToImport,
                  setExistingRecipeToImport: setExistingPublicRecipeToImport,
                  importing: importingPublic,
                  setImporting: setImportingPublic,
                  isPrivate: false,
                },
                {
                  id: "private",
                  existingRecipes: existingPrivateRecipes,
                  existingRecipeToImport: existingPrivateRecipeToImport,
                  setExistingRecipeToImport: setExistingPrivateRecipeToImport,
                  importing: importingPrivate,
                  setImporting: setImportingPrivate,
                  isPrivate: true,
                },
              ].map(
                (
                  {
                    id,
                    existingRecipes,
                    existingRecipeToImport,
                    setExistingRecipeToImport,
                    importing,
                    setImporting,
                    isPrivate,
                  },
                  i,
                ) => (
                  <div
                    key={i}
                    className="flex flex-row w-full text-sm/6 text-center text-left"
                  >
                    <input
                      list={`existing-recipes-${id}`}
                      className={inputClass}
                      placeholder={`${isPrivate ? "Private" : "Public"} recipes`}
                      value={existingRecipeToImport}
                      onChange={(e) =>
                        setExistingRecipeToImport(e.target.value)
                      }
                      disabled={disabled}
                    />
                    <datalist id={`existing-recipes-${id}`}>
                      {existingRecipes?.map((recipe, i) => (
                        <option key={i} value={recipe} />
                      ))}
                    </datalist>
                    <button
                      disabled={disabled}
                      className={buttonClass}
                      onClick={async (e) => {
                        e.preventDefault();

                        handleImport(
                          existingRecipeToImport,
                          isPrivate,
                          setImporting,
                        );
                      }}
                    >
                      {importing ? "Importing..." : "Import"}
                    </button>
                  </div>
                ),
              )}
            </div>
            <div
              id="Create"
              className="flex flex-col w-full gap-[2px] row-start-2 items-center"
            >
              <div
                id="Create title"
                className="flex flex-row w-full items-stretch"
              >
                <a
                  className="text-xl md:text-3xl text-center text-left bg-blue-900 hover:bg-blue-700 py-2 px-4 rounded inline-flex items-center cursor-pointer"
                  onClick={async (e) => {
                    e.preventDefault();

                    redirect(
                      [
                        ...window.location.href.split("/").slice(0, -1),
                        "upload",
                      ].join("/"),
                    );
                  }}
                >
                  Or, create a brand-new recipe
                </a>
              </div>
            </div>
          </form>
        )}
      </Authenticator>
    </div>
  );
}
