'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { faImage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser, getCurrentUser } from 'aws-amplify/auth';
import { getUrl, uploadData } from 'aws-amplify/storage';
import Image from 'next/image';
import { useEffect, useState } from 'react';

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
const buttonClass = `my-2 hover:${gray.secondary} text-white px-2 rounded-xs transition duration-300 ease-in-out`;
const textAreaClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

const defaultIngredientsCount = 5;
const defaultStepsCount = 5;

export default function RecipeForm() {
    const recipeDate = new Date();

    const [submitting, setSubmitting] = useState(false);

    const [user, setUser] = useState<AuthUser | null>(null);

    const [recipeName, setRecipeName] = useState('');
    const [recipeDesc, setRecipeDesc] = useState('');
    const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);

    const [recipeIngredients, setIngredients] = useState(new Array(defaultIngredientsCount).fill(''));
    const [recipeSteps, setSteps] = useState(new Array(defaultStepsCount).fill(''));

    useEffect(() => {
        getCurrentUser()
            .then((currentUser) => {
                setUser(currentUser);
                console.log('Signed in');
            })
            .catch((e) => {
                console.log(`Could not retrieve current user: ${e}`);
            });
    }, []);

    async function handleUpload() {
        const recipeData: RecipeData = {
            recipeDateMilliseconds: recipeDate.getTime(),
            recipeName,
            recipeDesc,
            recipeIngredients,
            recipeSteps,
        };

        if ([recipeName, recipeDesc, ...recipeIngredients, ...recipeSteps].some((s) => s.length === 0)) {
            return console.error(`Invalid input: recipeData=${JSON.stringify(recipeData)}`);
        }

        const recipeDirName = recipeData.recipeName.replace(/[^a-zA-Z0-9]/g, '_');
        const directory = `recipe-data/${recipeDirName}`;
        const recipeDataPath = `${directory}/data.json`;
        const recipeImagePath = `${directory}/image.png`;

        console.log('Checking recipe existence...');

        const recipeDataExists = await getUrl({
            path: recipeDataPath,
            options: { validateObjectExistence: true },
        })
            .then(() => true)
            .catch(() => false);

        if (recipeDataExists && !window.confirm('Recipe already exists, would you like to overwrite it?')) {
            return console.error(`Rejecting upload for existing recipe: recipeData=${JSON.stringify(recipeData)}`);
        }

        console.log('Uploading data...');

        uploadData({
            path: recipeDataPath,
            data: JSON.stringify(recipeData),
        });

        if (recipeImageFile !== null) {
            console.log('Uploading image...');

            uploadData({
                path: recipeImagePath,
                data: recipeImageFile,
            });
        }
    }

    return (
        <div className='font-sans grid items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20'>
            <Authenticator hideSignUp>
                {({ signOut }) => (
                    <form className='font-mono flex flex-col gap-[32px] row-start-2'>
                        <div
                            id='Title'
                            className='flex flex-1 flex-col row-start-2 items-center sm:items-center text-5xl'
                        >
                            <input
                                value={recipeName}
                                placeholder='Recipe name'
                                onChange={(e) => setRecipeName(e.target.value)}
                                className='text-center pb-4'
                            />
                            {recipeImageFile ? (
                                <Image
                                    src={URL.createObjectURL(recipeImageFile)}
                                    alt='Uploaded recipe photo'
                                    height={360}
                                    width={360}
                                    style={{ height: 'auto', width: 'auto' }}
                                    priority
                                />
                            ) : (
                                <FontAwesomeIcon icon={faImage} style={{ width: 360, height: 360 }} />
                            )}

                            <input
                                type='file'
                                id='recipe-photo'
                                name='Recipe photo'
                                accept='image/png'
                                hidden
                                onChange={(event) => {
                                    if (event.target.files && event.target.files[0]) {
                                        setRecipeImageFile(event.target.files[0]);
                                    }
                                }}
                            />
                            <label
                                htmlFor='recipe-photo'
                                className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 mt-4 rounded inline-flex items-center text-sm cursor-pointer'
                            >
                                Upload photo
                            </label>
                        </div>
                        <div id='Content' className='flex w-full flex-col gap-[8px] row-start-2 items-center'>
                            <p className='text-3xl text-center text-left'>Born on {recipeDate.toLocaleDateString()}</p>
                            <textarea
                                value={recipeDesc}
                                placeholder='Recipe description'
                                onChange={(e) => setRecipeDesc(e.target.value)}
                                className={textAreaClass}
                            />
                            <hr />
                            <div id='Ingredients' className='flex w-full flex-col gap-[2px] row-start-2 items-center'>
                                <div id='Ingredients title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-3xl text-center text-left'>Ingredients</p>
                                    <button
                                        className={buttonClass}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIngredients([...recipeIngredients, '']);
                                        }}
                                    >
                                        Add ingredient
                                    </button>
                                </div>
                                <ul className={listClass}>
                                    {recipeIngredients.map((ingredient, i) => (
                                        <li
                                            key={i}
                                            className='flex flex-row items-left text-sm/6 text-center text-left'
                                        >
                                            <textarea
                                                value={ingredient}
                                                placeholder={`Ingredient ${i + 1}`}
                                                className={textAreaClass}
                                                onChange={(e) =>
                                                    setIngredients([
                                                        ...recipeIngredients.slice(0, i),
                                                        e.target.value,
                                                        ...recipeIngredients.slice(i + 1),
                                                    ])
                                                }
                                            />
                                            {recipeIngredients.length > 1 && (
                                                <button
                                                    className={buttonClass}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setIngredients([
                                                            ...recipeIngredients.slice(0, i),
                                                            ...recipeIngredients.slice(i + 1),
                                                        ]);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div id='Steps' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                                <div id='Steps title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-3xl text-center text-left'>Steps</p>
                                    <button
                                        className={buttonClass}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSteps([...recipeSteps, '']);
                                        }}
                                    >
                                        Add step
                                    </button>
                                </div>
                                <ul className={listClass}>
                                    {recipeSteps.map((ingredient, i) => (
                                        <li key={i} className='flex flex-row text-sm/6 text-center text-left'>
                                            <textarea
                                                value={ingredient}
                                                placeholder={`Step ${i + 1}`}
                                                className={textAreaClass}
                                                onChange={(e) =>
                                                    setSteps([
                                                        ...recipeSteps.slice(0, i),
                                                        e.target.value,
                                                        ...recipeSteps.slice(i + 1),
                                                    ])
                                                }
                                            />
                                            {recipeSteps.length > 1 && (
                                                <button
                                                    className={buttonClass}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSteps([
                                                            ...recipeSteps.slice(0, i),
                                                            ...recipeSteps.slice(i + 1),
                                                        ]);
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div
                                id='Upload'
                                className='flex flex-col w-full gap-[16px] justify-center items-center mt-4'
                            >
                                <button
                                    disabled={submitting}
                                    className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
                                    onClick={async (e) => {
                                        e.preventDefault();

                                        if (submitting) {
                                            return console.warn('Upload in progress');
                                        }

                                        console.log('Starting upload workflow...');
                                        setSubmitting(true);

                                        await handleUpload();

                                        console.log('Upload workflow complete');
                                        setSubmitting(false);
                                    }}
                                >
                                    Submit
                                </button>
                                <button
                                    className='bg-red-300 hover:bg-red-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (window.confirm('Sign out of the Upload page?')) {
                                            signOut && signOut();
                                        }
                                    }}
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Authenticator>
        </div>
    );
}
