import {
  RecipeMetaData,
  TotalRecipeMetaData,
} from "@/app/types/recipe/metadata";
import { downloadData, uploadData } from "aws-amplify/storage";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fetchAuthSession } from "aws-amplify/auth";
import { Amplify } from "aws-amplify";

type RecipeMetaDataPath =
  | "private-recipe-metadata/metadata.json"
  | "recipe-metadata/metadata.json";

export const RecipeMetaDataDAO = {
  getMetaDataPath(isPrivate: boolean): RecipeMetaDataPath {
    return `${isPrivate ? "private-recipe-metadata" : "recipe-metadata"}/metadata.json`;
  },

  async get(recipeName: string, isPrivate: boolean): Promise<RecipeMetaData> {
    let recipeMetaData = null;
    try {
      recipeMetaData = (await this.getAll(isPrivate))[recipeName];
    } catch (e) {
      console.warn(`Could not retrieve recipe metadata: ${e}`);
    }

    if (!recipeMetaData) {
      throw new Error("Could not retrieve recipe metadata");
    }

    return recipeMetaData;
  },

  async getAll(isPrivate: boolean): Promise<TotalRecipeMetaData> {
    try {
      const path = this.getMetaDataPath(isPrivate);
      console.log(`Loading all recipe metadata at ${path}...`);

      const { body } = await downloadData({ path }).result;
      const totalRecipeMetaData: TotalRecipeMetaData = JSON.parse(
        await body.text(),
      );

      console.log(`Got recipe metadata ${JSON.stringify(totalRecipeMetaData)}`);

      return totalRecipeMetaData;
    } catch (e) {
      console.warn(`Could not retrieve all recipe metadata: ${e}`);
      return {};
    }
  },

  async add(
    recipeMetaData: RecipeMetaData,
    recipeName: string,
    isPrivate: boolean,
  ): Promise<void> {
    const existingTotalMetaData = await this.getAll(isPrivate);
    const path = this.getMetaDataPath(isPrivate);
    console.log(`Uploading metadata to ${path}...`);

    // Bucket
    const amplifyS3 = Amplify.getConfig().Storage?.S3;
    if (!amplifyS3) {
      throw new Error("Could not resolve recipe data source");
    }
    const { bucket, region } = amplifyS3;

    // Auth
    const session = await fetchAuthSession();
    const s3 = new S3Client({
      region: region,
      credentials: session.credentials,
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: JSON.stringify({
          ...existingTotalMetaData,
          [recipeName]: recipeMetaData,
        }),
        ContentType: "application/json",
        CacheControl: "no-cache, no-store, must-revalidate",
      }),
    );
  },

  async remove(recipeName: string, isPrivate: boolean): Promise<void> {
    const totalMetaData = await this.getAll(isPrivate);
    const path = this.getMetaDataPath(isPrivate);

    console.log(
      `Removing metadata for ${recipeName} from recipe metadata ${path}...`,
    );
    delete totalMetaData[recipeName];

    console.log(`Uploading metadata to ${path}...`);
    uploadData({ path, data: JSON.stringify(totalMetaData) });
  },
};
