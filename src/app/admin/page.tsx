"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { downloadData, list, uploadData } from "aws-amplify/storage";
import JSZip from "jszip";
import { redirect } from "next/navigation";
import { RecipeMetaDataDAO } from "../datastore/recipe/metadata";
import { RecipeMetaData, TotalRecipeMetaData } from "../types/recipe/metadata";

export default function AdminPage() {
  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 md:px-[20%]">
      <Authenticator hideSignUp>
        {({ signOut }) => (
          <div className="font-mono flex flex-col row-start-2 w-full max-w-full">
            <div
              id="Title"
              className="flex flex-1 flex-col row-start-2 items-center sm:items-center md:text-5xl text-3xl w-full max-w-full"
            >
              <h1 className="text-center wrap-break-word p-4 rounded-sm">
                Administrator actions
              </h1>
            </div>
            <div
              id="Content"
              className="flex w-full flex-col gap-[8px] row-start-2 items-center"
            >
              <div
                id="Upload"
                className="flex flex-col w-full gap-[16px] justify-center items-center mt-4"
              >
                <button
                  className={`bg-yellow-800 hover:bg-yellow-600 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (
                      window.confirm(
                        "Download ALL recipes? This will take a while.",
                      )
                    ) {
                      console.log(`Listing all data...`);

                      const publicListResult = await list({
                        path: "recipe-data/",
                        options: { listAll: true },
                      });
                      const privateListResult = await list({
                        path: "private-recipe-data/",
                        options: { listAll: true },
                      });
                      const allItems = [
                        ...privateListResult.items,
                        ...publicListResult.items,
                      ];

                      const allResults = await Promise.all(
                        allItems.map(async (item) => {
                          console.log(`Downloading ${item.path}...`);
                          const data = await downloadData({ path: item.path })
                            .result;
                          console.log(`Downloaded ${item.path}`);
                          return data;
                        }),
                      );

                      console.log(`Processing all data...`);

                      const zip = new JSZip();

                      await Promise.all(
                        allResults.map(async (result) => {
                          console.log(`Processing ${result.path}...`);
                          const blob = await result.body.blob();
                          console.log(`Processed ${result.path}`);
                          zip.file(result.path, blob);
                        }),
                      );

                      console.log("Zipping results...");

                      const zipBlob = await zip.generateAsync({ type: "blob" });

                      console.log("Attempting download...");

                      const link = document.createElement("a");
                      link.href = URL.createObjectURL(zipBlob);
                      link.download = `griffins_recipes_${new Date().getTime()}`;
                      link.click();
                      URL.revokeObjectURL(link.href);

                      console.log("Download complete");
                    }
                  }}
                >
                  Download All
                </button>
                <button
                  className={`bg-red-900 hover:bg-red-700 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                  onClick={async (e) => {
                    e.preventDefault();
                    if (
                      window.confirm(
                        "Sync recipe list displayed on the homepage? You only need to do this if (1) the list isn't displaying new recipes or (2) you deleted a recipe and want to recover it. Note that this will recover all deleted recipes. Reach out to Griffin if you want your recipe permanently deleted.",
                      )
                    ) {
                      async function loadExistingRecipes(
                        topLevelFolder: string,
                      ): Promise<string[]> {
                        try {
                          const result = await list({
                            path: `${topLevelFolder}/`,
                            options: {
                              listAll: true,
                              subpathStrategy: {
                                strategy: "exclude",
                                delimiter: "/",
                              },
                            },
                          });

                          return (
                            result.excludedSubpaths?.map(
                              (recipePath) =>
                                recipePath
                                  .match(`${topLevelFolder}\/(.*)\/`)
                                  ?.at(1) ?? "<unknown>",
                            ) ?? []
                          );
                        } catch (e) {
                          window.alert(`Could not retrieve recipes: ${e}`);
                          return [];
                        }
                      }

                      console.log(`Listing all data...`);

                      const publicListResult =
                        await loadExistingRecipes("recipe-data");
                      const privateListResult = await loadExistingRecipes(
                        "private-recipe-data",
                      );

                      console.log(`Listing all metadata...`);

                      const resolveDrift = async (
                        isPrivate: boolean,
                        allRecipes: string[],
                      ): Promise<TotalRecipeMetaData> => {
                        const currentMetaData =
                          await RecipeMetaDataDAO.getAll(isPrivate);

                        const correctedMetaData = allRecipes.reduce(
                          (acc: TotalRecipeMetaData, recipeName: string) => {
                            let recipe: RecipeMetaData =
                              currentMetaData[recipeName];
                            if (!recipe) {
                              console.warn(
                                `Recipe "${recipeName}" was not in the current metadata. Adding.`,
                              );
                              recipe = { isPrivate, recipeAuthor: null };
                            }

                            return { ...acc, [recipeName]: recipe };
                          },
                          {},
                        );

                        console.log(
                          `Finished resolving drift: before=${JSON.stringify(currentMetaData)} after=${JSON.stringify(correctedMetaData)}`,
                        );

                        Object.keys(currentMetaData).forEach((recipeName) => {
                          if (!correctedMetaData[recipeName]) {
                            console.warn(
                              `Recipe "${recipeName}" was in the current metadata but not in the existing recipes. Removing.`,
                            );
                          }
                        });

                        return correctedMetaData;
                      };

                      console.log("Updating public metadata...");

                      const publicMetaData = await resolveDrift(
                        false,
                        publicListResult,
                      );
                      uploadData({
                        path: "recipe-metadata/metadata.json",
                        data: JSON.stringify(publicMetaData),
                      });

                      console.log("Updating private metadata...");

                      const privateMetaData = await resolveDrift(
                        true,
                        privateListResult,
                      );
                      uploadData({
                        path: "private-recipe-metadata/metadata.json",
                        data: JSON.stringify(privateMetaData),
                      });

                      console.log(
                        `Synchronization complete: `,
                        publicMetaData,
                        privateMetaData,
                      );
                    }
                  }}
                >
                  Manually sync recipe list
                </button>
                <button
                  className="bg-red-900 hover:bg-red-700 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.confirm("Sign out of the Upload page?")) {
                      signOut && signOut();
                    }
                  }}
                >
                  Sign Out
                </button>
                <button
                  className="bg-blue-900 hover:bg-blue-700 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    redirect(
                      window.location.href.split("/").slice(0, -1).join("/"),
                    );
                  }}
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        )}
      </Authenticator>
    </div>
  );
}
