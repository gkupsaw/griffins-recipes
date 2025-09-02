'use client';

import { faImage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { downloadData } from 'aws-amplify/storage';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import defaultRecipeImage from '../img/default.png';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

type RecipeData = {
    readonly recipeDateMilliseconds: number;
    readonly recipeName: string;
    readonly recipeDesc: string;
    readonly recipeIngredients: string[];
    readonly recipeSteps: string[];
};

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'w-full list-inside list-decimal text-sm/6 text-center sm:text-left';
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

const LOADING = 'Loading...';

export default function RecipePage() {
    const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
    const [recipeImage, setRecipeImage] = useState<Blob | null>(null);
    const [recipeImageNotFound, setRecipeImageNotFound] = useState<boolean>(false);

    useEffect(() => {
        async function loadData() {
            const searchParams = new URLSearchParams(document.location.search);
            const recipeDirName = searchParams.get('recipename');

            if (recipeDirName === null) {
                redirect('/');
            }

            await downloadData({ path: `recipe-data/${recipeDirName}/data.json` })
                .result.then(({ body }) =>
                    body
                        .text()
                        .then((text) => {
                            const parsedRecipeData = JSON.parse(text);
                            setRecipeData({
                                ...parsedRecipeData,
                                recipeDate: new Date(Date.parse(parsedRecipeData.recipeDate)),
                            });
                        })
                        .catch((e) => window.alert(`Could not unpack recipe ${recipeDirName}: ${e}`))
                )
                .catch((e) => window.alert(`Could not retrieve recipe ${recipeDirName}: ${e}`));

            await downloadData({ path: `recipe-data/${recipeDirName}/image.png` })
                .result.then(({ body }) =>
                    body
                        .blob()
                        .then((image) => setRecipeImage(image))
                        .catch((e) => window.alert(`Could not unpack image for recipe ${recipeDirName}: ${e}`))
                )
                .catch((e) => {
                    console.warn(`Could not retrieve image for recipe ${recipeDirName}, using default: ${e}`);
                    setRecipeImageNotFound(true);
                });
        }

        loadData();
    }, []);

    const loading = (recipeImage === null && !recipeImageNotFound) || recipeData === null;

    return (
        <div className='font-mono grid items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20'>
            <main className='flex flex-col gap-[32px] row-start-2 justify-center'>
                <div id='Title' className='flex flex-1 flex-col row-start-2 items-center sm:items-center text-5xl'>
                    <p className='text-center pb-4'>{loading ? LOADING : recipeData.recipeName}</p>
                    {loading ? (
                        <FontAwesomeIcon icon={faImage} style={{ width: 360, height: 360 }} />
                    ) : (
                        <Image
                            src={recipeImage === null ? defaultRecipeImage : URL.createObjectURL(recipeImage)}
                            alt='Recipe photo'
                            height={360}
                            width={360}
                            style={{ height: 'auto', width: 'auto' }}
                            priority
                        />
                    )}
                </div>
                <div id='Content' className='flex w-full flex-col gap-[8px] row-start-2 items-center'>
                    <p className='text-3xl text-center text-left'>
                        Born on {loading ? LOADING : new Date(recipeData.recipeDateMilliseconds).toLocaleDateString()}
                    </p>
                    <p className={inputClass}>{loading ? LOADING : recipeData.recipeDesc}</p>
                    <hr />
                    <div id='Ingredients' className='flex w-full flex-col gap-[2px] row-start-2 items-center'>
                        <div id='Ingredients title' className='flex flex-row w-full items-stretch'>
                            <p className='flex-grow text-3xl text-center text-left'>Ingredients</p>
                        </div>
                        <ul className={listClass}>
                            {(loading ? [LOADING] : recipeData.recipeIngredients).map((ingredient, i) => (
                                <li key={i} className={inputClass}>
                                    {ingredient}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div id='Steps' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                        <div id='Steps title' className='flex flex-row w-full items-stretch'>
                            <p className='flex-grow text-3xl text-center text-left'>Steps</p>
                        </div>
                        <ul className={listClass}>
                            {(loading ? [LOADING] : recipeData.recipeSteps).map((step, i) => (
                                <li key={i} className={inputClass}>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </main>
            <footer className='row-start-3 flex gap-[24px] flex-row flex-wrap items-center justify-center pt-8'>
                <a
                    className='flex items-center gap-2 hover:underline hover:underline-offset-4'
                    href='https://www.griffinkupsaw.com/griffins-recipes'
                >
                    Home
                </a>
                <a
                    className='flex items-center gap-2 hover:underline hover:underline-offset-4 text-3xl'
                    href='https://github.com/gkupsaw/griffins-recipes'
                    target='_blank'
                    rel='noopener noreferrer'
                >
                    <FontAwesomeIcon icon={faGithub} />
                </a>
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
