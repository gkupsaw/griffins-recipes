"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AuthUser } from "aws-amplify/auth";
import { useEffect, useState } from "react";
import { RecipeMetaDataDAO } from "./datastore/recipe/metadata";
import { UserDAO } from "./datastore/user/cognito";
import { RecipeMetaData } from "./types/recipe/metadata";
import { Icon } from "@iconify/react";
import { motion, AnimatePresence } from "framer-motion";

const MISC_AUTHOR = "Misc";

const gray = {
  primary: "bg-gray-800",
  secondary: "bg-gray-500",
};

const listClass =
  "list-inside text-center justify-items-center gap-[4px] flex flex-col";
const inputClass = `text-sm/6 text-center justify-items-center ${gray.primary} p-2 my-1 rounded-sm`;

type Recipe = {
  readonly recipeName: string;
  readonly recipeMetaData: RecipeMetaData;
};

export default function RecipePage() {
  const [publicRecipes, setPublicRecipes] = useState<Record<
    string,
    Recipe[]
  > | null>(null);
  const [privateRecipes, setPrivateRecipes] = useState<Record<
    string,
    Recipe[]
  > | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const sortAuthors = (authorA: string, authorB: string) =>
    MISC_AUTHOR === authorA
      ? 1
      : MISC_AUTHOR === authorB
        ? -1
        : authorA.localeCompare(authorB);

  useEffect(() => {
    (async () => {
      const currentUser = await UserDAO.getCurrentUser();

      async function loadRecipes(
        isPrivate: boolean,
      ): Promise<Record<string, Recipe[]>> {
        return Object.entries(await RecipeMetaDataDAO.getAll(isPrivate))
          .map(([recipeName, recipeMetaData]) => ({
            recipeName,
            recipeMetaData,
          }))
          .sort((a, b) => a.recipeName.localeCompare(b.recipeName))
          .reduce((acc: Record<string, Recipe[]>, recipe) => {
            const author = recipe.recipeMetaData.recipeAuthor ?? MISC_AUTHOR;
            return { ...acc, [author]: [...(acc[author] ?? []), recipe] };
          }, {});
      }

      await loadRecipes(false)
        .then(setPublicRecipes)
        .catch((e) => {
          window.alert(`Could not load public recipes.`);
          console.warn(e);
        });

      if (UserDAO.isAuthenticated(currentUser)) {
        await loadRecipes(true)
          .then(setPrivateRecipes)
          .catch((e) => {
            window.alert(`Could not load private recipes.`);
            console.warn(e);
          });
      }

      setUser(currentUser);
    })();
  }, []);

  const loading = publicRecipes === null;
  const authenticated = UserDAO.isAuthenticated(user);

  return (
    <div className="font-mono flex flex-grow flex-col items-center justify-items-center min-h-screen sm:pt-20 sm:pl-20 sm:pr-20">
      <main className="flex flex-col row-start-2 justify-items-center flex-grow">
        <div
          id="Recipes"
          className="flex flex-grow flex-col w-full gap-[24px] row-start-2 justify-items-center text-center justify-center"
        >
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
                <motion.div
                  id="Recipes title"
                  className="flex flex-row w-full items-stretch"
                  key="title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="flex-grow text-3xl md:text-8xl">Recipes</p>
                </motion.div>
                {authenticated && (
                  <motion.a
                    className="text-nowrap w-fit fixed top-0 right-0 m-8 z-50 text-xl md:text-xl text-center bg-blue-900 hover:bg-blue-700 py-2 px-4 rounded cursor-pointer"
                    href="import"
                    key="uploadlink"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    Upload or edit recipes
                  </motion.a>
                )}
                <motion.div
                  id="Public recipes title"
                  className="flex flex-row w-full items-stretch"
                  key="public-title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="flex-grow text-xl md:text-3xl">Public</p>
                </motion.div>
                <ul className={listClass}>
                  {Object.entries(publicRecipes)
                    .sort(([a], [b]) => sortAuthors(a, b))
                    .map(([author, recipes], i) => (
                      <div key={author}>
                        <motion.div
                          id="Public author title"
                          className="flex flex-row w-full items-stretch mb-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5, delay: i * 0.25 }}
                        >
                          <p className="flex-grow text-xl">{author}</p>
                        </motion.div>
                        {recipes.map((recipe, j) => (
                          <motion.li
                            key={recipe.recipeName}
                            className={inputClass}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: 0.5,
                              delay: i * 0.25 + j * 0.25,
                            }}
                          >
                            <a
                              className="hover:underline hover:underline-offset-4 text-center text-xl p-8"
                              href={`recipe?recipename=${recipe.recipeName}&private=false`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {recipe.recipeName}
                            </a>
                          </motion.li>
                        ))}
                      </div>
                    ))}
                </ul>
                {privateRecipes && (
                  <>
                    <motion.div
                      id="Private recipes title"
                      className="flex flex-row w-full items-stretch"
                      key="private-title"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className="flex-grow text-xl md:text-3xl">Private</p>
                    </motion.div>
                    <ul className={listClass}>
                      {Object.entries(privateRecipes)
                        .sort(([a], [b]) => sortAuthors(a, b))
                        .map(([author, recipes], i) => (
                          <div key={author}>
                            <motion.div
                              id="Private author title"
                              className="flex flex-row w-full items-stretch mb-4"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5, delay: i * 0.25 }}
                            >
                              <p className="flex-grow text-xl text-center">
                                {author}
                              </p>
                            </motion.div>
                            {recipes.map((recipe, j) => (
                              <motion.li
                                key={recipe.recipeName}
                                className={inputClass}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{
                                  duration: 0.5,
                                  delay: i * 0.25 + j * 0.25,
                                }}
                              >
                                <a
                                  className="hover:underline hover:underline-offset-4 text-center text-xl p-8"
                                  href={`recipe?recipename=${recipe.recipeName}&private=true`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {recipe.recipeName}
                                </a>
                              </motion.li>
                            ))}
                          </div>
                        ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
      <footer className="flex flex-row justify-items-center flex-wrap row-start-3 my-8">
        <a
          className="flex-1 hover:underline hover:underline-offset-4 text-center text-3xl"
          href="https://github.com/gkupsaw/griffins-recipes"
          target="_blank"
          rel="noopener noreferrer"
          style={{ width: "5em" }}
        >
          <FontAwesomeIcon icon={faGithub} />
        </a>
        <a
          className="flex-1 hover:underline hover:underline-offset-4 text-center"
          href="https://www.griffinkupsaw.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ width: "6em" }}
        >
          Click me!
        </a>
      </footer>
    </div>
  );
}
