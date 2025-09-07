import { getUrl } from 'aws-amplify/storage';

export const RecipeImageDAO = {
    async getUrl(recipeName: string, isPrivate: boolean): Promise<string> {
        const topLevelFolder = isPrivate ? 'private-recipe-data' : 'recipe-data';
        try {
            const { url } = await getUrl({
                path: `${topLevelFolder}/${recipeName}/image.png`,
                options: { validateObjectExistence: true },
            });
            return url.href;
        } catch (e) {
            throw new Error(`Could not retrieve image for recipe ${recipeName}: ${e}`);
        }
    },
};
