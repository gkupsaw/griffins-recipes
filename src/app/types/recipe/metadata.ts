export type RecipeMetaData = {
    readonly isPrivate: boolean;
    readonly recipeAuthor: string | null;
};

export type TotalRecipeMetaData = Record<string, RecipeMetaData>;
