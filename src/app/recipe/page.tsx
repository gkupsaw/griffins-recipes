"use client";

import { Icon } from "@iconify/react";
import { AuthUser } from "aws-amplify/auth";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { RecipeDataDAO } from "../datastore/recipe/data";
import { RecipeImageDAO } from "../datastore/recipe/image";
import { RecipeMetaDataDAO } from "../datastore/recipe/metadata";
import { UserDAO } from "../datastore/user/cognito";
import Footer from "../footer";
import defaultRecipeImage from "../img/default.png";
import { RecipeData } from "../types/recipe/data";
import { RecipeMetaData } from "../types/recipe/metadata";

const gray = {
  primary: "bg-gray-800",
  secondary: "bg-gray-500",
};

const listClass =
  "w-full list-inside list-decimal text-sm/6 text-center sm:text-left";
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

export default function RecipePage() {
  const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
  const [recipeMetaData, setRecipeMetaData] = useState<RecipeMetaData | null>(
    null,
  );
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [recipeImageNotFound, setRecipeImageNotFound] =
    useState<boolean>(false);
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function loadData() {
      const searchParams = new URLSearchParams(document.location.search);
      const recipeName = searchParams.get("recipename");

      if (recipeName === null) {
        redirect("/");
      }

      const privateParam = searchParams.get("private") === "true";
      setIsPrivate(privateParam);

      await RecipeDataDAO.get(recipeName, privateParam)
        .then(setRecipeData)
        .catch(window.alert);

      await RecipeMetaDataDAO.get(recipeName, privateParam)
        .then(setRecipeMetaData)
        .catch(window.alert);

      await RecipeImageDAO.getUrl(recipeName, privateParam)
        .then(setRecipeImage)
        .catch((e) => {
          console.warn(e);
          setRecipeImageNotFound(true);
        });
    }

    loadData();

    (async () => {
      setUser(await UserDAO.getCurrentUser());
    })();
  }, []);

  const loading =
    (recipeImage === null && !recipeImageNotFound) ||
    recipeData === null ||
    recipeMetaData === null;

  return (
    <div className="font-mono flex flex-grow flex-col items-center justify-items-center min-h-screen sm:pt-20 sm:pl-20 sm:pr-20">
      <main className="flex flex-grow flex-col gap-[32px] row-start-2 justify-center">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Icon
                icon="eos-icons:bubble-loading"
                style={{ fontSize: "128px" }}
              />
            </motion.div>
          ) : (
            <>
              <div
                id="Title"
                className="flex flex-1 flex-col row-start-2 items-center sm:items-center text-5xl"
              >
                <motion.p
                  className="text-center pb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                >
                  {recipeData.recipeName}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Image
                    src={
                      recipeImage === null ? defaultRecipeImage : recipeImage
                    }
                    alt="Recipe photo"
                    height={360}
                    width={360}
                    style={{ height: "auto", width: "auto" }}
                    priority
                  />
                </motion.div>
              </div>
              <div
                id="Content"
                className="flex w-full flex-col row-start-2 items-center"
              >
                <motion.p
                  className="text-3xl w-full text-left"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.75 }}
                >
                  Born on{" "}
                  {new Date(
                    recipeData.recipeDateMilliseconds,
                  ).toLocaleDateString()}
                </motion.p>
                {recipeMetaData?.recipeAuthor && (
                  <motion.p
                    className={inputClass}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, delay: 0.85 }}
                  >
                    Authored with love by {recipeMetaData.recipeAuthor}
                  </motion.p>
                )}
                <motion.p
                  className={inputClass}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.95 }}
                >
                  Description: {recipeData.recipeDesc}
                </motion.p>
                <motion.hr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                />
                <div
                  id="Ingredients"
                  className="flex w-full flex-col gap-[2px] row-start-2 items-center"
                >
                  <div
                    id="Ingredients title"
                    className="flex flex-row w-full items-stretch"
                  >
                    <motion.p
                      className="flex-grow text-3xl text-center text-left"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 1 }}
                    >
                      Ingredients
                    </motion.p>
                  </div>
                  <ul className={listClass}>
                    {recipeData.recipeIngredients.map((ingredient, i) => (
                      <motion.li
                        key={i}
                        className={inputClass}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
                      >
                        {ingredient}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div
                  id="Steps"
                  className="flex flex-col w-full gap-[2px] row-start-2 items-center"
                >
                  <div
                    id="Steps title"
                    className="flex flex-row w-full items-stretch"
                  >
                    <motion.p
                      className="flex-grow text-3xl text-center text-left"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 1.25 }}
                    >
                      Steps
                    </motion.p>
                  </div>
                  <ul className={listClass}>
                    {recipeData.recipeSteps.map((step, i) => (
                      <motion.li
                        key={i}
                        className={inputClass}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, delay: 1.25 + i * 0.1 }}
                      >
                        {step}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                {recipeData && UserDAO.isAuthenticated(user) && (
                  <>
                    <motion.a
                      className="flex-1 hover:underline hover:underline-offset-4 text-center"
                      href={`upload?recipename=${recipeData.recipeName}&private=${isPrivate}`}
                      style={{ width: "6em" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 2 }}
                    >
                      Edit
                    </motion.a>
                    <motion.p
                      className="flex-1 hover:underline hover:underline-offset-4 text-center"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Are you sure you want to delete this recipe?",
                          )
                        ) {
                          return;
                        }

                        // Only remove the metadata marker - keep recipe data around for recovery if needed
                        await RecipeMetaDataDAO.remove(
                          recipeData.recipeName,
                          isPrivate,
                        );

                        // Nullify data to trigger loading screen
                        setRecipeData(null);

                        // Redirect home
                        redirect(
                          window.location.href
                            .split("/")
                            .slice(0, -1)
                            .join("/"),
                        );
                      }}
                      style={{ width: "6em", cursor: "pointer" }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 2 }}
                    >
                      Delete
                    </motion.p>
                    <motion.a
                      className="flex-1 hover:underline hover:underline-offset-4 text-center"
                      href="import"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, delay: 2 }}
                    >
                      Edit others or upload new
                    </motion.a>
                  </>
                )}
              </div>
            </>
          )}
        </AnimatePresence>
      </main>
      <Footer hasHome={true} />
    </div>
  );
}
