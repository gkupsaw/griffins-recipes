import { RecipeData } from './../../types/recipe/data';
import { downloadData, getUrl, remove, uploadData } from 'aws-amplify/storage';

export const RecipeDataDAO = {
    getDataPath(recipeName: string, isPrivate: boolean): string {
        return `${isPrivate ? 'private-recipe-data' : 'recipe-data'}/${recipeName}/data.json`;
    },

    async get(recipeName: string, isPrivate: boolean): Promise<RecipeData> {
        try {
            const path = this.getDataPath(recipeName, isPrivate);
            console.log(`Loading recipe at ${path}...`);

            const { body } = await downloadData({ path }).result;
            const parsedRecipeData: RecipeData = JSON.parse(await body.text());
            return parsedRecipeData;
        } catch (e) {
            throw new Error(`Could not retrieve recipe ${recipeName}: ${e}`);
        }
    },

    async exists(recipeName: string, isPrivate: boolean): Promise<boolean> {
        try {
            const path = this.getDataPath(recipeName, isPrivate);
            console.log(`Checking recipe at ${path}...`);

            await getUrl({ path, options: { validateObjectExistence: true } });
            return true;
        } catch {
            return false;
        }
    },

    put(recipeData: RecipeData, isPrivate: boolean): void {
        const path = this.getDataPath(recipeData.recipeName, isPrivate);
        console.log(`Uploading recipe data to ${path}...`);
        uploadData({ path, data: JSON.stringify(recipeData) });
    },

    async delete(recipeName: string, isPrivate: boolean): Promise<void> {
        try {
            const path = this.getDataPath(recipeName, isPrivate);
            console.log(`Deleting data at ${path}...`);
            await remove({ path });
        } catch (e) {
            console.warn(`Could not delete data: ${e}`);
        }
    },
};
