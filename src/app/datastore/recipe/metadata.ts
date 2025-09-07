import { RecipeMetaData, TotalRecipeMetaData } from '@/app/types/recipe/metadata';
import { downloadData, uploadData } from 'aws-amplify/storage';

type RecipeMetaDataPath = 'private-recipe-metadata/metadata.json' | 'recipe-metadata/metadata.json';

export const RecipeMetaDataDAO = {
    getMetaDataPath(isPrivate: boolean): RecipeMetaDataPath {
        return `${isPrivate ? 'private-recipe-metadata' : 'recipe-metadata'}/metadata.json`;
    },

    async getAll(isPrivate: boolean): Promise<TotalRecipeMetaData> {
        try {
            const path = this.getMetaDataPath(isPrivate);
            console.log(`Loading all recipe metadata at ${path}...`);

            const { body } = await downloadData({ path }).result;
            const totalRecipeMetaData: TotalRecipeMetaData = JSON.parse(await body.text());
            return totalRecipeMetaData;
        } catch (e) {
            console.warn(`Could not retrieve all recipe metadata: ${e}`);
            return {};
        }
    },

    async add(recipeMetaData: RecipeMetaData, recipeName: string, isPrivate: boolean): Promise<void> {
        const existingTotalMetaData = await this.getAll(isPrivate);
        const path = this.getMetaDataPath(isPrivate);
        console.log(`Uploading metadata to ${path}...`);
        uploadData({ path, data: JSON.stringify({ ...existingTotalMetaData, [recipeName]: recipeMetaData }) });
    },

    async remove(recipeName: string, isPrivate: boolean): Promise<void> {
        const totalMetaData = await this.getAll(isPrivate);
        const path = this.getMetaDataPath(isPrivate);

        console.log(`Removing metadata for ${recipeName} from recipe metadata ${path}...`);
        delete totalMetaData[recipeName];

        console.log(`Uploading metadata to ${path}...`);
        uploadData({ path, data: JSON.stringify(totalMetaData) });
    },
};
