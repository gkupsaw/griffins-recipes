"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { faImage } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AuthUser } from "aws-amplify/auth";
import Image from "next/image";
import { useEffect, useState } from "react";
import { RecipeDataDAO } from "../datastore/recipe/data";
import { RecipeImageDAO } from "../datastore/recipe/image";
import { RecipeMetaDataDAO } from "../datastore/recipe/metadata";
import Footer from "../footer";
import { RecipeData } from "../types/recipe/data";
import { RecipeMetaData } from "../types/recipe/metadata";
import { loadRecipe } from "./load_recipe";
import { Alert } from "./load_recipe/alerts";

const getDefaultRecipeData = (): RecipeData => ({
  recipeName: "",
  recipeDesc: "",
  recipeDateMilliseconds: new Date().getTime(),
  recipeIngredients: new Array(defaultIngredientsCount).fill(""),
  recipeSteps: new Array(defaultStepsCount).fill(""),
});

const getDefaultRecipeMetaData = (): RecipeMetaData => ({
  isPrivate: false,
  recipeAuthor: null,
});

// For simplicity and ease of querying I'm using the recipe name as the folder ID
// Obviously this is a big no-no for a real app, but with the limited user-set the worst case scenario is a malformed recipe
const sanitizeRecipeName = (s: string): string => {
  return s.replaceAll(/[\/\n\t\r]/g, "");
};

const gray = {
  primary: "bg-gray-800",
  secondary: "bg-gray-500",
};

const listClass =
  "w-full list-inside list-decimal text-sm/6 text-center sm:text-left";
const buttonClass = `hover:${gray.secondary} text-white px-2 rounded-xs transition duration-300 ease-in-out`;
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;
const settingClass = `text-l text-center text-left ${gray.primary} p-2 my-1 rounded-sm`;

const defaultIngredientsCount = 1;
const defaultStepsCount = 1;

export default function RecipeForm() {
  // Uncontrolled right now, deciding on UI
  const [useIngredientsMultibox, setUseIngredientsMultibox] = useState(true);
  const [useStepsMultibox, setUseStepsMultibox] = useState(true);

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [recipeImage, setRecipeImage] = useState<File | string | null>(null);
  const [recipeState, setRecipeState] = useState<RecipeData>(
    getDefaultRecipeData(),
  );
  const [recipeMetaData, setRecipeMetaData] = useState<RecipeMetaData>(
    getDefaultRecipeMetaData(),
  );

  const {
    recipeName,
    recipeDesc,
    recipeDateMilliseconds,
    recipeIngredients,
    recipeSteps,
  } = recipeState;

  const { isPrivate, recipeAuthor } = recipeMetaData;

  const [submitting, setSubmitting] = useState(false);
  const [recipeUrl, setRecipeUrl] = useState<string | null>(null);

  const [isLocalStorageLoaded, setIsLocalStorageLoaded] =
    useState<boolean>(false);

  useEffect(() => {
    (async () =>
      setAlerts(
        await loadRecipe(
          recipeState,
          recipeMetaData,
          setUser,
          setRecipeState,
          setRecipeMetaData,
          setRecipeImage,
          setIsLocalStorageLoaded,
        ),
      ))();
  }, []);

  useEffect(() => {
    if (!isLocalStorageLoaded) {
      console.log("Loading recipe data from local storage...");
      return;
    }

    console.log("Saving recipe data to local storage");

    localStorage.setItem(
      "in-progress-recipe",
      JSON.stringify({ data: recipeState, metadata: recipeMetaData }),
    );
  }, [recipeState, recipeMetaData, isLocalStorageLoaded]);

  async function handleUpload() {
    if (
      [recipeName, recipeDesc, ...recipeIngredients, ...recipeSteps].some(
        (s) => s.length === 0,
      )
    ) {
      window.alert(
        `Missing input for the following fields: ${Object.entries({
          recipeName,
          recipeDesc,
          recipeIngredients,
          recipeSteps,
        })
          .filter(([_, v]) =>
            typeof v === "object"
              ? (v as string[]).some((s) => s.length === 0)
              : v.length === 0,
          )
          .map(([k, _]) => k)}`,
      );
      return console.warn(
        `Invalid input: recipeState=${JSON.stringify(recipeState)}`,
      );
    }

    const recipeDirName = recipeName;
    const topLevelFolder = isPrivate ? "private-recipe-data" : "recipe-data";
    const directory = `${topLevelFolder}/${recipeDirName}`;

    console.log("Checking recipe existence...");

    if (
      (await RecipeDataDAO.exists(recipeName, isPrivate)) &&
      !window.confirm("Recipe already exists, would you like to overwrite it?")
    ) {
      return console.warn(
        `Rejecting upload for existing recipe: recipeState=${JSON.stringify(recipeState)}`,
      );
    }

    RecipeDataDAO.put(recipeState, isPrivate);

    if (recipeImage !== null && typeof recipeImage === "object") {
      RecipeImageDAO.put(recipeImage, recipeName, isPrivate);
    }

    const uploadedRecipeUrl =
      window.location.href.split("upload")[0] +
      "recipe?recipename=" +
      recipeDirName +
      (isPrivate ? "&private=true" : "");

    setRecipeUrl(uploadedRecipeUrl);

    console.log("Updating metadata...");

    await RecipeMetaDataDAO.add(recipeMetaData, recipeName, isPrivate);

    console.log(`Checking if duplicate data for ${directory} needs cleanup...`);

    if (await RecipeDataDAO.exists(recipeName, !isPrivate)) {
      RecipeDataDAO.delete(recipeName, !isPrivate);

      RecipeImageDAO.delete(recipeName, !isPrivate);

      await RecipeMetaDataDAO.remove(recipeName, !isPrivate);
    } else {
      console.log("No duplicate data found");
    }
  }

  const disabled = submitting;

  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-h-screen sm:pt-20 sm:pl-20 sm:pr-20">
      <Authenticator hideSignUp>
        {({ signOut }) => (
          <form className="font-mono flex flex-col gap-[32px] row-start-2 w-full max-w-full">
            {alerts.length > 0 && (
              <div
                className="bg-blue-100 border border-blue-400 text-black px-4 py-3 rounded relative"
                role="alert"
              >
                <strong className="font-bold">
                  {alerts[0].type === "INFO" ? "Good news! " : "Oops... "}{" "}
                </strong>
                <p className="block sm:inline">{alerts[0].message}</p>
                <div
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                  onClick={(e) => {
                    e.preventDefault();
                    setAlerts(alerts.slice(1));
                  }}
                >
                  <svg
                    className="fill-current h-6 w-6 text-blue-500 cursor-pointer"
                    role="button"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <title>Close</title>
                    <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
                  </svg>
                </div>
              </div>
            )}
            <div
              id="Title"
              className="flex flex-1 flex-col row-start-2 items-center sm:items-center md:text-5xl text-3xl w-full max-w-full"
            >
              <textarea
                value={recipeName}
                placeholder="Recipe name"
                onChange={(e) =>
                  setRecipeState({
                    ...recipeState,
                    recipeName: sanitizeRecipeName(e.target.value),
                  })
                }
                className="text-center pb-4 wrap-break-word bg-gray-800 p-4 rounded-sm"
              />
              {recipeImage !== null ? (
                <Image
                  src={
                    typeof recipeImage === "string"
                      ? recipeImage
                      : URL.createObjectURL(recipeImage)
                  }
                  alt="Uploaded recipe photo"
                  height={360}
                  width={360}
                  style={{ height: "auto", width: "auto" }}
                  priority
                />
              ) : (
                <FontAwesomeIcon
                  icon={faImage}
                  style={{ width: 360, height: 360 }}
                />
              )}

              <input
                type="file"
                id="recipe-photo"
                name="Recipe photo"
                accept="image/png"
                hidden
                onChange={(event) => {
                  if (event.target.files && event.target.files[0]) {
                    setRecipeImage(event.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="recipe-photo"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 mt-4 rounded inline-flex items-center text-sm cursor-pointer"
              >
                Upload photo
              </label>
            </div>
            <div
              id="Content"
              className="flex w-full flex-col gap-[8px] row-start-2 items-center"
            >
              <div
                id="Overview title"
                className="flex flex-row items-center gap-4 w-full justify-start"
              >
                <p className="flex-grow text-xl md:text-3xl text-center text-left">
                  Overview
                </p>
              </div>
              <div
                id="Overview content"
                className="flex w-full flex-col gap-2 row-start-2 items-center"
              >
                <div
                  id="Togglable content"
                  className="flex flex-row items-center gap-4 text-center"
                  style={{ alignSelf: "start" }}
                >
                  <div
                    id="Togglable labels"
                    className="flex flex-col items-start justify-center gap-4 text-sm/6"
                    style={{ alignSelf: "start" }}
                  >
                    <p className="flex-grow text-l text-center">
                      Born on{" "}
                      {new Date(recipeDateMilliseconds).toLocaleDateString()}
                    </p>
                    <label
                      htmlFor="isPrivate"
                      className="flex-grow text-l text-center"
                    >
                      Private recipe?
                    </label>
                  </div>
                  <div
                    id="Togglable inputs"
                    className="flex flex-col items-center justify-center gap-4"
                    style={{ alignSelf: "start" }}
                  >
                    <button
                      className={`bg-blue-800 hover:bg-blue-600 py-0.5 px-1 rounded inline-flex items-center text-xs cursor-pointer`}
                      onClick={(e) => {
                        e.preventDefault();
                        setRecipeState({
                          ...recipeState,
                          recipeDateMilliseconds: new Date().getTime(),
                        });
                      }}
                    >
                      Reset
                    </button>
                    <input
                      id="isPrivate"
                      type="checkbox"
                      checked={isPrivate}
                      className="cursor-pointer"
                      style={{ width: "1.5em", height: "1.5em" }}
                      onChange={() =>
                        setRecipeMetaData({
                          ...recipeMetaData,
                          isPrivate: !isPrivate,
                        })
                      }
                    />
                  </div>
                </div>
                <textarea
                  value={recipeDesc}
                  placeholder="Recipe description"
                  onChange={(e) =>
                    setRecipeState({
                      ...recipeState,
                      recipeDesc: e.target.value,
                    })
                  }
                  className={inputClass}
                />
                <textarea
                  value={recipeAuthor ?? ""}
                  placeholder="Recipe author (optional)"
                  onChange={({ target: { value } }) =>
                    setRecipeMetaData({
                      ...recipeMetaData,
                      recipeAuthor: value.length > 0 ? value : null,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <hr />
              {/* <div
                id="Settings"
                className="flex flex-col w-full gap-[2px] row-start-2 items-start"
              >
                <div
                  id="Settings title"
                  className="flex flex-row items-center gap-4 w-full justify-start"
                >
                  <p className="flex-grow text-xl md:text-3xl text-center text-left">
                    Settings
                  </p>
                </div>
                <ul className={listClass}>
                  <li className="flex flex-row items-center gap-4 text-sm/6 text-center text-left">
                    <input
                      id="isMultibox"
                      type="checkbox"
                      className="pb-4 cursor-pointer"
                      style={{ width: "2em", height: "2em" }}
                      onChange={(e) => setUseMultibox(e.target.checked)}
                    />
                    <label htmlFor="isMultibox" className={settingClass}>
                      Split ingredients and steps into multiple input boxes
                    </label>
                  </li>
                  {useMultibox && (
                    <p className="text-l text-center text-left w-full p-2 bg-yellow-800 mb-2 rounded-sm">
                      Press <code>Enter</code> on a step/ingredient to add
                      another step/ingredient. Or, paste multiline text
                      (separated with a newline) to add multiple
                      steps/ingredients at once.
                    </p>
                  )}
                </ul>
              </div> */}
              <div
                id="Ingredients"
                className="flex w-full flex-col gap-[2px] row-start-2 items-center"
              >
                <div
                  id="Ingredients title"
                  className="flex flex-row w-full items-stretch"
                >
                  <p className="flex-grow text-xl md:text-3xl text-center text-left">
                    Ingredients
                  </p>
                  {useIngredientsMultibox && (
                    <button
                      className={buttonClass}
                      onClick={(e) => {
                        e.preventDefault();
                        setRecipeState({
                          ...recipeState,
                          recipeIngredients: [...recipeIngredients, ""],
                        });
                      }}
                    >
                      Add ingredient
                    </button>
                  )}
                </div>
                {useIngredientsMultibox ? (
                  <ul className={listClass}>
                    {recipeIngredients.map((ingredient, i) => (
                      <li
                        key={i}
                        className="flex flex-row items-left text-sm/6 text-center text-left"
                      >
                        <textarea
                          value={ingredient}
                          placeholder={`Ingredient ${i + 1}`}
                          className={inputClass}
                          onChange={(e) => {
                            setRecipeState({
                              ...recipeState,
                              recipeIngredients: [
                                ...recipeIngredients.slice(0, i),
                                ...e.target.value
                                  .split("\n")
                                  // Filter out non-ASCII chars
                                  .map((s) => s.replace(/[^\x00-\x7F]/g, "")),
                                ...recipeIngredients.slice(i + 1),
                              ],
                            });
                          }}
                        />
                        {recipeIngredients.length > 1 && (
                          <button
                            className={buttonClass}
                            onClick={(e) => {
                              e.preventDefault();
                              setRecipeState({
                                ...recipeState,
                                recipeIngredients: [
                                  ...recipeIngredients.slice(0, i),
                                  ...recipeIngredients.slice(i + 1),
                                ],
                              });
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <textarea
                    value={recipeIngredients.join("\n")}
                    placeholder="Ingredients"
                    className={inputClass}
                    onChange={(e) => {
                      setRecipeState({
                        ...recipeState,
                        recipeIngredients: e.target.value
                          .split("\n")
                          // Filter out non-ASCII chars
                          .map((s) => s.replace(/[^\x00-\x7F]/g, "")),
                      });
                    }}
                  />
                )}
              </div>
              <div
                id="Steps"
                className="flex flex-col w-full gap-[2px] row-start-2 items-center"
              >
                <div
                  id="Steps title"
                  className="flex flex-row w-full items-stretch"
                >
                  <p className="flex-grow text-xl md:text-3xl text-center text-left">
                    Steps
                  </p>
                  {useStepsMultibox && (
                    <button
                      className={buttonClass}
                      onClick={(e) => {
                        e.preventDefault();
                        setRecipeState({
                          ...recipeState,
                          recipeSteps: [...recipeSteps, ""],
                        });
                      }}
                    >
                      Add step
                    </button>
                  )}
                </div>
                {useStepsMultibox ? (
                  <ul className={listClass}>
                    {recipeSteps.map((ingredient, i) => (
                      <li
                        key={i}
                        className="flex flex-row text-sm/6 text-center text-left"
                      >
                        <textarea
                          value={ingredient}
                          placeholder={`Step ${i + 1}`}
                          className={inputClass}
                          onChange={(e) =>
                            setRecipeState({
                              ...recipeState,
                              recipeSteps: [
                                ...recipeSteps.slice(0, i),
                                ...e.target.value
                                  .split("\n")
                                  // Filter out non-ASCII chars
                                  .map((s) => s.replace(/[^\x00-\x7F]/g, "")),
                                ...recipeSteps.slice(i + 1),
                              ],
                            })
                          }
                        />
                        {recipeSteps.length > 1 && (
                          <button
                            className={buttonClass}
                            onClick={(e) => {
                              e.preventDefault();
                              setRecipeState({
                                ...recipeState,
                                recipeSteps: [
                                  ...recipeSteps.slice(0, i),
                                  ...recipeSteps.slice(i + 1),
                                ],
                              });
                            }}
                          >
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <textarea
                    value={recipeSteps.join("\n")}
                    placeholder="Steps"
                    className={inputClass}
                    onChange={(e) => {
                      setRecipeState({
                        ...recipeState,
                        recipeSteps: e.target.value
                          .split("\n")
                          // Filter out non-ASCII chars
                          .map((s) => s.replace(/[^\x00-\x7F]/g, "")),
                      });
                    }}
                  />
                )}
              </div>

              <div
                id="Upload"
                className="flex flex-col w-full gap-[16px] justify-center items-center mt-4"
              >
                {recipeUrl && (
                  <p className="flex-grow text-xl text-center text-green-500 font-bold">
                    Upload complete!! :) Your recipe will be available at{" "}
                    <a
                      className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                      href={recipeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {recipeUrl}
                    </a>
                    . It may take a minute or two for it to show up.
                  </p>
                )}
                <button
                  disabled={disabled}
                  className={`bg-${disabled ? "blue" : "gray"}-300 hover:bg-${
                    disabled ? "blue" : "gray"
                  }-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                  onClick={async (e) => {
                    e.preventDefault();

                    if (disabled) {
                      return console.warn(
                        "Operation in progress, cannot submit",
                      );
                    }

                    console.log("Starting upload workflow...");
                    setSubmitting(true);

                    await handleUpload();

                    localStorage.removeItem("in-progress-recipe");

                    console.log("Upload workflow complete");
                    setSubmitting(false);
                  }}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
                <button
                  disabled={disabled}
                  className={`bg-${disabled ? "blue" : "yellow"}-800 hover:bg-${
                    disabled ? "blue" : "yellow"
                  }-600 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                  onClick={async (e) => {
                    e.preventDefault();

                    if (disabled) {
                      return console.warn(
                        "Operation in progress, cannot clear form",
                      );
                    }

                    if (!window.confirm("Completely clear the upload form?")) {
                      return console.warn("Rejecting clear operation");
                    }

                    setRecipeState(getDefaultRecipeData());
                    setRecipeMetaData(getDefaultRecipeMetaData());
                    setRecipeImage(null);
                  }}
                >
                  Clear form
                </button>
              </div>
            </div>
          </form>
        )}
      </Authenticator>
      <Footer hasHome={true} />
    </div>
  );
}
