import { RecipeData } from './../../types/recipe/data';
import { downloadData } from 'aws-amplify/storage';

export const RecipeDataDAO = {
    async get(recipeName: string, isPrivate: boolean): Promise<RecipeData> {
        const topLevelFolder = isPrivate ? 'private-recipe-data' : 'recipe-data';
        try {
            const { body } = await downloadData({ path: `${topLevelFolder}/${recipeName}/data.json` }).result;
            const parsedRecipeData: RecipeData = JSON.parse(await body.text());
            return parsedRecipeData;
        } catch (e) {
            throw new Error(`Could not retrieve recipe ${recipeName}: ${e}`);
        }
    },
};
