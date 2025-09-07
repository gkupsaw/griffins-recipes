'use client';

import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faImage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser, getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RecipeDataDAO } from '../datastore/recipe/data';
import { RecipeImageDAO } from '../datastore/recipe/image';
import defaultRecipeImage from '../img/default.png';
import { RecipeData } from '../types/recipe/data';
import { UserDAO } from '../datastore/user/cognito';

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'w-full list-inside list-decimal text-sm/6 text-center sm:text-left';
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

const LOADING = 'Loading...';

export default function RecipePage() {
    const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
    const [recipeImage, setRecipeImage] = useState<string | null>(null);
    const [recipeImageNotFound, setRecipeImageNotFound] = useState<boolean>(false);
    const [isPrivate, setIsPrivate] = useState<boolean>(false);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        async function loadData() {
            const searchParams = new URLSearchParams(document.location.search);
            const recipeName = searchParams.get('recipename');

            if (recipeName === null) {
                redirect('/');
            }

            const privateParam = searchParams.get('private') === 'true';
            setIsPrivate(privateParam);

            await RecipeDataDAO.get(recipeName, privateParam)
                .then(setRecipeData)
                .catch(window.alert);

            await RecipeImageDAO.getUrl(recipeName, privateParam)
                .then(setRecipeImage)
                .catch((e) => {
                    console.warn(e);
                    setRecipeImageNotFound(true);
                });
        }

        loadData();

        (async () => {
            setUser(await UserDAO.getCurrentUser());
        })();
    }, []);

    const loading = (recipeImage === null && !recipeImageNotFound) || recipeData === null;

    return (
        <div className='font-mono flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20'>
            <main className='flex flex-col gap-[32px] row-start-2 justify-center'>
                <div id='Title' className='flex flex-1 flex-col row-start-2 items-center sm:items-center text-5xl'>
                    <p className='text-center pb-4'>{loading ? LOADING : recipeData.recipeName}</p>
                    {loading ? (
                        <FontAwesomeIcon icon={faImage} style={{ width: 360, height: 360 }} />
                    ) : (
                        <Image
                            src={recipeImage === null ? defaultRecipeImage : recipeImage}
                            alt='Recipe photo'
                            height={360}
                            width={360}
                            style={{ height: 'auto', width: 'auto' }}
                            priority
                        />
                    )}
                </div>
                <div id='Content' className='flex w-full flex-col gap-[8px] row-start-2 items-center'>
                    <p className='text-3xl w-full text-left'>
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
                    {recipeData && UserDAO.isAuthenticated(user) && (
                        <>
                            <a
                                className='flex-1 hover:underline hover:underline-offset-4 text-center'
                                href={`upload?recipename=${recipeData.recipeName}&private=${isPrivate}`}
                                style={{ width: '6em' }}
                            >
                                Edit
                            </a>
                            <a
                                className='flex-1 hover:underline hover:underline-offset-4 text-center'
                                href='upload'
                                style={{ width: '6em' }}
                            >
                                Upload new
                            </a>
                        </>
                    )}
                </div>
            </main>
            <footer className='flex flex-row justify-items-center items-center flex-wrap row-start-3 my-8'>
                <a
                    className='flex-1 hover:underline hover:underline-offset-4 text-center'
                    href='https://www.griffinkupsaw.com/griffins-recipes'
                    style={{ width: '6em' }}
                >
                    Home
                </a>
                <a
                    className='flex-1 hover:underline hover:underline-offset-4 text-center text-3xl'
                    href='https://github.com/gkupsaw/griffins-recipes'
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{ width: '6em' }}
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
