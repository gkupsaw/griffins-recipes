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

export default function RecipePage() {
    const [recipes, setRecipes] = useState<string[] | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        async function loadData() {
            const topLevelFolder = 'recipe-data';
            await list({
                path: `${topLevelFolder}/`,
                options: {
                    listAll: true,
                    subpathStrategy: {
                        strategy: 'exclude',
                        delimiter: '/',
                    },
                },
            })
                .then((result) => {
                    setRecipes(
                        result.excludedSubpaths?.map(
                            (recipePath) => recipePath.match(`${topLevelFolder}\/(.*)\/`)?.at(1) ?? '<unknown>'
                        ) ?? []
                    );
                })
                .catch((e) => window.alert(`Could not retrieve recipes: ${e}`));
        }

        loadData();

        getCurrentUser()
            .then((currentUser) => {
                setUser(currentUser);
                console.log('Signed in');
            })
            .catch((e) => {
                console.log(`Could not retrieve current user: ${e}`);
            });
    }, []);

    const loading = recipes === null;

    return (
        <div className='font-mono flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20'>
            <main className='flex flex-col row-start-2 justify-items-center'>
                <div
                    id='Recipes'
                    className='flex flex-col w-full gap-[24px] row-start-2 justify-items-center text-center'
                >
                    {loading ? (
                        [LOADING]
                    ) : (
                        <>
                            <div id='Recipes title' className='flex flex-row w-full items-stretch'>
                                <p className='flex-grow text-3xl md:text-8xl'>Recipes</p>
                            </div>
                            <ul className={listClass}>
                                {recipes.map((recipe) => (
                                    <li key={recipe} className={inputClass}>
                                        <a
                                            className='hover:underline hover:underline-offset-4 text-center text-xl p-8'
                                            href={`recipe?recipename=${recipe}`}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            {recipe}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </main>
            <footer className='flex flex-row justify-items-center flex-wrap row-start-3 my-8'>
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
