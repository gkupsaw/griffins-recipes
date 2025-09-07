import { getUrl, uploadData } from 'aws-amplify/storage';

export const RecipeImageDAO = {
    async getUrl(recipeName: string, isPrivate: boolean): Promise<string> {
        try {
            const path = `${isPrivate ? 'private-recipe-data' : 'recipe-data'}/${recipeName}/image.png`;
            console.log(`Loading recipe image at ${path}...`);

            const { url } = await getUrl({ path, options: { validateObjectExistence: true } });
            return url.href;
        } catch (e) {
            throw new Error(`Could not retrieve image for recipe ${recipeName}: ${e}`);
        }
    },

    put(recipeImage: File, recipeName: string, isPrivate: boolean): void {
        const path = `${isPrivate ? 'private-recipe-data' : 'recipe-data'}/${recipeName}/data.json`;
        console.log(`Uploading recipe data to ${path}...`);
        uploadData({ path, data: recipeImage });
    },
};
