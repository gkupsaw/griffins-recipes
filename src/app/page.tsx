'use client';

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser, getCurrentUser } from 'aws-amplify/auth';
import { list } from 'aws-amplify/storage';
import { useEffect, useState } from 'react';

const LOADING = 'Loading...';

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'list-inside text-sm/6 text-center sm:text-left justify-items-center gap-[4px] flex flex-col';
const inputClass = `text-sm/6 text-center justify-items-center ${gray.primary} p-2 my-1 rounded-sm`;

type Recipe = {
    readonly name: string;
};

export default function RecipePage() {
    const [publicRecipes, setPublicRecipes] = useState<Recipe[] | null>(null);
    const [privateRecipes, setPrivateRecipes] = useState<Recipe[] | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        async function loadRecipes(topLevelFolder: string): Promise<string[]> {
            try {
                const result = await list({
                    path: `${topLevelFolder}/`,
                    options: {
                        listAll: true,
                        subpathStrategy: {
                            strategy: 'exclude',
                            delimiter: '/',
                        },
                    },
                });

                return (
                    result.excludedSubpaths?.map((recipePath) =>
                        (recipePath.split(topLevelFolder)[1] ?? '{misformatted recipe name}/').slice(1, -1)
                    ) ?? []
                );
            } catch (e) {
                window.alert(`Could not retrieve recipes: ${e}`);
                return [];
            }
        }

        (async () => {
            let user: AuthUser | null = null;
            try {
                user = await getCurrentUser();
                console.log('Signed in');
            } catch (e) {
                console.log(`Could not retrieve current user: ${e}`);
            }

            const loadedPublicRecipes: Recipe[] = (await loadRecipes('recipe-data')).map((name) => ({
                name,
                isPrivate: false,
            }));

            const loadedPrivateRecipes = user?.signInDetails
                ? (await loadRecipes('private-recipe-data')).map((name) => ({
                      name,
                      isPrivate: true,
                  }))
                : null;

            setPublicRecipes(loadedPublicRecipes);
            setPrivateRecipes(loadedPrivateRecipes);
            setUser(user);
        })();
    }, []);

    const loading = publicRecipes === null;
    const authenticated = !!user?.signInDetails;

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
                                {publicRecipes.map((recipe) => (
                                    <li key={recipe.name} className={inputClass}>
                                        <a
                                            className='hover:underline hover:underline-offset-4 text-center text-xl p-8'
                                            href={`recipe?recipename=${recipe.name}&private=false`}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            {recipe.name}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            {privateRecipes && (
                                <>
                                    <div id='Private recipes title' className='flex flex-row w-full items-stretch'>
                                        <p className='flex-grow text-xl md:text-3xl'>Private</p>
                                    </div>
                                    <ul className={listClass}>
                                        {privateRecipes.map((recipe) => (
                                            <li key={recipe.name} className={inputClass}>
                                                <a
                                                    className='hover:underline hover:underline-offset-4 text-center text-xl p-8'
                                                    href={`recipe?recipename=${recipe.name}&private=true`}
                                                    target='_blank'
                                                    rel='noopener noreferrer'
                                                >
                                                    {recipe.name}
                                                </a>
                                            </li>
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
