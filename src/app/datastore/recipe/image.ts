import { getUrl, remove, uploadData } from 'aws-amplify/storage';

export const RecipeImageDAO = {
    getImagePath(recipeName: string, isPrivate: boolean): string {
        return `${isPrivate ? 'private-recipe-data' : 'recipe-data'}/${recipeName}/image.png`;
    },

    async getUrl(recipeName: string, isPrivate: boolean): Promise<string> {
        try {
            const path = this.getImagePath(recipeName, isPrivate);
            console.log(`Loading recipe image at ${path}...`);

            const { url } = await getUrl({ path, options: { validateObjectExistence: true } });
            return url.href;
        } catch (e) {
            throw new Error(`Could not retrieve image for recipe ${recipeName}: ${e}`);
        }
    },

    put(recipeImage: File, recipeName: string, isPrivate: boolean): void {
        const path = this.getImagePath(recipeName, isPrivate);

        console.log(`Uploading recipe data to ${path}...`);
        uploadData({ path, data: recipeImage });
    },

    async delete(recipeName: string, isPrivate: boolean): Promise<void> {
        try {
            const path = this.getImagePath(recipeName, isPrivate);
            console.log(`Deleting image at ${path}...`);
            await remove({ path });
        } catch (e) {
            console.warn(`Could not delete image: ${e}`);
        }
    },
};
