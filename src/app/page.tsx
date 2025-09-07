'use client';

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import { RecipeMetaDataDAO } from './datastore/recipe/metadata';
import { UserDAO } from './datastore/user/cognito';
import { RecipeMetaData } from './types/recipe/metadata';

const LOADING = 'Loading...';

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'list-inside text-center justify-items-center gap-[4px] flex flex-col';
const inputClass = `text-sm/6 text-center justify-items-center ${gray.primary} p-2 my-1 rounded-sm`;

type Recipe = {
    readonly recipeName: string;
    readonly recipeMetaData: RecipeMetaData;
};

export default function RecipePage() {
    const [publicRecipes, setPublicRecipes] = useState<Record<string, Recipe[]> | null>(null);
    const [privateRecipes, setPrivateRecipes] = useState<Record<string, Recipe[]> | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        (async () => {
            const currentUser = await UserDAO.getCurrentUser();

            async function loadRecipes(isPrivate: boolean): Promise<Record<string, Recipe[]>> {
                return Object.entries(await RecipeMetaDataDAO.getAll(isPrivate))
                    .map(([recipeName, recipeMetaData]) => ({
                        recipeName,
                        recipeMetaData,
                    }))
                    .reduce((acc: Record<string, Recipe[]>, recipe) => {
                        const author = recipe.recipeMetaData.recipeAuthor ?? 'Misc';
                        return { ...acc, [author]: [...(acc[author] ?? []), recipe] };
                    }, {});
            }

            await loadRecipes(false)
                .then(setPublicRecipes)
                .catch((e) => {
                    window.alert(`Could not load public recipes.`);
                    console.warn(e);
                });

            if (UserDAO.isAuthenticated(currentUser)) {
                await loadRecipes(true)
                    .then(setPrivateRecipes)
                    .catch((e) => {
                        window.alert(`Could not load private recipes.`);
                        console.warn(e);
                    });
            }

            setUser(currentUser);
        })();
    }, []);

    const loading = publicRecipes === null;
    const authenticated = UserDAO.isAuthenticated(user);

    return (
        <div className='font-mono flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20'>
            <main className='flex flex-col row-start-2 justify-items-center'>
                <div
                    id='Recipes'
                    className='flex flex-col w-full gap-[24px] row-start-2 justify-items-center text-center'
                >
                    {loading ? (
                        <div id='Recipes title' className='flex flex-row w-full items-stretch'>
                            <p className='flex-grow text-3xl md:text-8xl'>{LOADING}</p>
                        </div>
                    ) : (
                        <>
                            <div id='Recipes title' className='flex flex-row w-full items-stretch'>
                                <p className='flex-grow text-3xl md:text-8xl'>Recipes</p>
                            </div>
                            {authenticated && (
                                <div id='Public recipes title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl'>Public</p>
                                </div>
                            )}
                            <ul className={listClass}>
                                {Object.entries(publicRecipes).map(([author, recipes]) => (
                                    <div key={author}>
                                        <div
                                            id='Public author title'
                                            className='flex flex-row w-full items-stretch mb-4'
                                        >
                                            <p className='flex-grow text-2xl'>{author}</p>
                                        </div>
                                        {recipes.map((recipe) => (
                                            <li key={recipe.recipeName} className={inputClass}>
                                                <a
                                                    className='hover:underline hover:underline-offset-4 text-center text-xl p-8'
                                                    href={`recipe?recipename=${recipe.recipeName}&private=false`}
                                                    target='_blank'
                                                    rel='noopener noreferrer'
                                                >
                                                    {recipe.recipeName}
                                                </a>
                                            </li>
                                        ))}
                                    </div>
                                ))}
                            </ul>
                            {privateRecipes && (
                                <>
                                    <div id='Private recipes title' className='flex flex-row w-full items-stretch'>
                                        <p className='flex-grow text-xl md:text-3xl'>Private</p>
                                    </div>
                                    <ul className={listClass}>
                                        {Object.entries(privateRecipes).map(([author, recipes]) => (
                                            <div key={author}>
                                                <div
                                                    id='Public author title'
                                                    className='flex flex-row w-full items-stretch mb-4'
                                                >
                                                    <p className='flex-grow text-2xl text-center'>{author}</p>
                                                </div>
                                                {recipes.map((recipe) => (
                                                    <li key={recipe.recipeName} className={inputClass}>
                                                        <a
                                                            className='hover:underline hover:underline-offset-4 text-center text-xl p-8'
                                                            href={`recipe?recipename=${recipe.recipeName}&private=true`}
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                        >
                                                            {recipe.recipeName}
                                                        </a>
                                                    </li>
                                                ))}
                                            </div>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
            <footer className='flex flex-row justify-items-center flex-wrap row-start-3 my-8'>
                {authenticated && (
                    <a
                        className='flex-1 hover:underline hover:underline-offset-4 text-center'
                        href='upload'
                        style={{ width: '6em' }}
                    >
                        Upload new recipe
                    </a>
                )}
                <a
                    className='flex-1 hover:underline hover:underline-offset-4 text-center text-3xl'
                    href='https://github.com/gkupsaw/griffins-recipes'
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{ width: '5em' }}
                >
                    <FontAwesomeIcon icon={faGithub} />
                </a>
                <a
                    className='flex-1 hover:underline hover:underline-offset-4 text-center'
                    href='https://www.griffinkupsaw.com/'
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{ width: '6em' }}
                >
                    Click me!
                </a>
            </footer>
        </div>
    );
}
