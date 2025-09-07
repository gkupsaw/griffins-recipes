import { RecipeData } from './../../types/recipe/data';
import { downloadData, getUrl } from 'aws-amplify/storage';

export const RecipeDataDAO = {
    async get(recipeName: string, isPrivate: boolean): Promise<RecipeData> {
        try {
            const path = `${isPrivate ? 'private-recipe-data' : 'recipe-data'}/${recipeName}/data.json`;
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
            const path = `${isPrivate ? 'private-recipe-data' : 'recipe-data'}/${recipeName}/data.json`;
            console.log(`Checking recipe at ${path}...`);

            await getUrl({ path, options: { validateObjectExistence: true } });
            return true;
        } catch {
            return false;
        }
    },
};
