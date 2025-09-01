'use client';

import { list } from 'aws-amplify/storage';
import { useEffect, useState } from 'react';

const LOADING = 'Loading...';

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'w-full list-inside text-sm/6 text-center sm:text-left';
const textAreaClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

export default function RecipePage() {
    const [recipes, setRecipes] = useState<string[] | null>(null);

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
    }, []);

    const loading = recipes === null;

    return (
        <div className='font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20'>
            <main className='flex flex-col gap-[32px] row-start-2 sm:items-start'>
                <div
                    id='Recipes'
                    className='flex flex-col w-full gap-[2px] row-start-2 items-center sm:items-start text-center '
                >
                    {loading ? (
                        [LOADING]
                    ) : (
                        <>
                            <div id='Steps title' className='flex flex-row w-full items-stretch'>
                                <p className='flex-grow text-3xl'>Recipes</p>
                            </div>
                            <ul className={listClass}>
                                {recipes.map((recipe, i) => (
                                    <li key={recipe} className={textAreaClass}>
                                        <a
                                            className='hover:underline hover:underline-offset-4 text-left w-full'
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
            <footer className='row-start-3 flex gap-[24px] flex-wrap items-center justify-center'>
                <a
                    className='flex items-center gap-2 hover:underline hover:underline-offset-4'
                    href='https://www.griffinkupsaw.com/'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    Click me!
                </a>
            </footer>
        </div>
    );
}
