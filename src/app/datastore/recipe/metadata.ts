import { TotalRecipeMetaData } from '@/app/types/recipe/metadata';
import { downloadData } from 'aws-amplify/storage';

export const RecipeMetaDataDAO = {
    async getAll(isPrivate: boolean): Promise<TotalRecipeMetaData> {
        try {
            const path = `${isPrivate ? 'private-recipe-metadata' : 'recipe-metadata'}/metadata.json`;
            console.log(`Loading recipes at ${path}...`);

            const { body } = await downloadData({ path }).result;
            const totalRecipeMetaData: TotalRecipeMetaData = JSON.parse(await body.text());
            return totalRecipeMetaData;
        } catch (e) {
            throw new Error(`Could not retrieve total recipe metadata: ${e}`);
        }
    },
};
