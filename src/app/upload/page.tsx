'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faImage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser, getCurrentUser } from 'aws-amplify/auth';
import { downloadData, getUrl, list, uploadData } from 'aws-amplify/storage';
import JSZip from 'jszip';
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
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

const defaultIngredientsCount = 5;
const defaultStepsCount = 5;

export default function RecipeForm() {
    const [recipeDate, setRecipeDate] = useState(new Date());

    const [submitting, setSubmitting] = useState(false);
    const [importing, setImporting] = useState(false);

    const [existingRecipes, setExistingRecipes] = useState<string[] | null>(null);
    const [existingRecipeToImport, setExistingRecipeToImport] = useState<string>('');

    const [user, setUser] = useState<AuthUser | null>(null);

    const [recipeName, setRecipeName] = useState('');
    const [recipeDesc, setRecipeDesc] = useState('');
    const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);

    const [recipeIngredients, setIngredients] = useState(new Array(defaultIngredientsCount).fill(''));
    const [recipeSteps, setSteps] = useState(new Array(defaultStepsCount).fill(''));

    const [recipeUrl, setRecipeUrl] = useState<string | null>(null);

    useEffect(() => {
        const inProgressRecipe = localStorage.getItem('in-progress-recipe');
        if (inProgressRecipe !== null) {
            console.log(`In progress recipe data found: ${inProgressRecipe}`);
            const inProgressRecipeData: RecipeData = JSON.parse(inProgressRecipe);
            if (inProgressRecipeData.recipeName) setRecipeName(inProgressRecipeData.recipeName);
            if (inProgressRecipeData.recipeDesc) setRecipeDesc(inProgressRecipeData.recipeDesc);
            if (inProgressRecipeData.recipeDateMilliseconds)
                setRecipeDate(new Date(inProgressRecipeData.recipeDateMilliseconds));
            if (inProgressRecipeData.recipeIngredients) setIngredients(inProgressRecipeData.recipeIngredients);
            if (inProgressRecipeData.recipeSteps) setSteps(inProgressRecipeData.recipeSteps);
        }

        getCurrentUser()
            .then((currentUser) => {
                setUser(currentUser);
                console.log('Signed in');
            })
            .catch((e) => {
                console.log(`Could not retrieve current user: ${e}`);
            });

        async function loadExistingRecipes() {
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
                    setExistingRecipes(
                        result.excludedSubpaths?.map(
                            (recipePath) => recipePath.match(`${topLevelFolder}\/(.*)\/`)?.at(1) ?? '<unknown>'
                        ) ?? []
                    );
                })
                .catch((e) => window.alert(`Could not retrieve recipes: ${e}`));
        }

        loadExistingRecipes();
    }, []);

    useEffect(() => {
        const recipeData: RecipeData = {
            recipeDateMilliseconds: recipeDate.getTime(),
            recipeName,
            recipeDesc,
            recipeIngredients,
            recipeSteps,
        };

        console.log('Saving recipe data to local storage');

        localStorage.setItem('in-progress-recipe', JSON.stringify(recipeData));
    }, [recipeDate, recipeName, recipeDesc, recipeIngredients, recipeSteps]);

    async function handleImport() {
        if (!existingRecipeToImport) {
            return window.alert('No recipe name provided');
        }

        await downloadData({ path: `recipe-data/${existingRecipeToImport}/data.json` })
            .result.then(({ body }) =>
                body
                    .text()
                    .then((text) => {
                        const parsedRecipeData: RecipeData = JSON.parse(text);
                        setRecipeName(parsedRecipeData.recipeName);
                        setRecipeDate(new Date(parsedRecipeData.recipeDateMilliseconds));
                        setRecipeDesc(parsedRecipeData.recipeDesc);
                        setIngredients(parsedRecipeData.recipeIngredients);
                        setSteps(parsedRecipeData.recipeSteps);
                    })
                    .catch((e) => window.alert(`Could not unpack recipe ${existingRecipeToImport}: ${e}`))
            )
            .catch((e) => window.alert(`Could not retrieve recipe ${existingRecipeToImport}: ${e}`));

        await downloadData({ path: `recipe-data/${existingRecipeToImport}/image.png` })
            .result.then(({ body }) =>
                body
                    .blob()
                    .then((blob) => {
                        setRecipeImageFile(new File([blob], 'image.png'));
                    })
                    .catch((e) => window.alert(`Could not unpack image for recipe ${existingRecipeToImport}: ${e}`))
            )
            .catch(() => setRecipeImageFile(null));
    }

    async function handleUpload() {
        const recipeData: RecipeData = {
            recipeDateMilliseconds: recipeDate.getTime(),
            recipeName,
            recipeDesc,
            recipeIngredients,
            recipeSteps,
        };

        if ([recipeName, recipeDesc, ...recipeIngredients, ...recipeSteps].some((s) => s.length === 0)) {
            window.alert('Invalid input, all fields must be filled');
            return console.warn(`Invalid input: recipeData=${JSON.stringify(recipeData)}`);
        }

        const recipeDirName = recipeData.recipeName;
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
            return console.warn(`Rejecting upload for existing recipe: recipeData=${JSON.stringify(recipeData)}`);
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

        const uploadedRecipeUrl = window.location.href.split('upload')[0] + 'recipe?recipename=' + recipeDirName;
        setRecipeUrl(uploadedRecipeUrl);
    }

    return (
        <div className='font-sans grid items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20'>
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
                            <div className='flex flex-row text-sm/6 text-center text-left gap-[16px]'>
                                <p className='text-3xl text-center text-left'>
                                    Born on {recipeDate.toLocaleDateString()}
                                </p>
                                <button
                                    className={buttonClass}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setRecipeDate(new Date());
                                    }}
                                >
                                    Reset
                                </button>
                            </div>
                            <textarea
                                value={recipeDesc}
                                placeholder='Recipe description'
                                onChange={(e) => setRecipeDesc(e.target.value)}
                                className={inputClass}
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
                                                className={inputClass}
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
                                                className={inputClass}
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
                            <div id='Import' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                                <div id='Import title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-3xl text-center text-left'>Import existing recipe</p>
                                </div>
                                <div className='flex flex-row w-full text-sm/6 text-center text-left'>
                                    <input
                                        list='existing-recipes'
                                        className={inputClass}
                                        placeholder='Select existing recipe'
                                        value={existingRecipeToImport}
                                        onChange={(e) => setExistingRecipeToImport(e.target.value)}
                                        disabled={importing}
                                    />
                                    <datalist id='existing-recipes'>
                                        {existingRecipes?.map((recipe) => (
                                            <option key={recipe} value={recipe} />
                                        ))}
                                    </datalist>
                                    <button
                                        disabled={importing}
                                        className={buttonClass}
                                        onClick={async (e) => {
                                            e.preventDefault();

                                            if (importing) {
                                                return console.warn('Import in progress');
                                            }

                                            console.log('Starting import workflow...');
                                            setImporting(true);

                                            await handleImport();

                                            console.log('Upload import complete');
                                            setExistingRecipeToImport('');
                                            setImporting(false);
                                        }}
                                    >
                                        {importing ? 'Importing...' : 'Import'}
                                    </button>
                                </div>
                            </div>

                            <div
                                id='Upload'
                                className='flex flex-col w-full gap-[16px] justify-center items-center mt-4'
                            >
                                {recipeUrl && (
                                    <p className='flex-grow text-xl text-center text-green-500 font-bold'>
                                        Upload complete!! :) Your recipe is available at{' '}
                                        <a
                                            className='flex items-center gap-2 hover:underline hover:underline-offset-4'
                                            href={recipeUrl}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            {recipeUrl}
                                        </a>
                                    </p>
                                )}
                                <button
                                    disabled={submitting}
                                    className={`bg-${submitting ? 'blue' : 'gray'}-300 hover:bg-${
                                        submitting ? 'blue' : 'gray'
                                    }-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                                    onClick={async (e) => {
                                        e.preventDefault();

                                        if (submitting) {
                                            return console.warn('Upload in progress');
                                        }

                                        console.log('Starting upload workflow...');
                                        setSubmitting(true);

                                        await handleUpload();

                                        localStorage.removeItem('in-progress-recipe');

                                        console.log('Upload workflow complete');
                                        setSubmitting(false);
                                    }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                                <button
                                    className='bg-yellow-300 hover:bg-yellow-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        if (window.confirm('Download ALL recipes? This will take a while.')) {
                                            console.log(`Listing all data...`);

                                            const allFiles = await list({
                                                path: 'recipe-data/',
                                                options: { listAll: true },
                                            });

                                            const allResults = await Promise.all(
                                                allFiles.items.map(async (item) => {
                                                    console.log(`Downloading ${item.path}...`);
                                                    const data = await downloadData({ path: item.path }).result;
                                                    console.log(`Downloaded ${item.path}`);
                                                    return data;
                                                })
                                            );

                                            console.log(`Processing all data...`);

                                            const zip = new JSZip();

                                            await Promise.all(
                                                allResults.map(async (result) => {
                                                    console.log(`Processing ${result.path}...`);
                                                    const blob = await result.body.blob();
                                                    console.log(`Processed ${result.path}`);
                                                    zip.file(result.path, blob);
                                                })
                                            );

                                            console.log('Zipping results...');

                                            const zipBlob = await zip.generateAsync({ type: 'blob' });

                                            console.log('Attempting download...');

                                            const link = document.createElement('a');
                                            link.href = URL.createObjectURL(zipBlob);
                                            link.download = `griffins_recipes_${new Date().getTime()}`;
                                            link.click();
                                            URL.revokeObjectURL(link.href);

                                            console.log('Download complete');
                                        }
                                    }}
                                >
                                    Download All
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
            <footer className='row-start-3 flex gap-[24px] flex-row flex-wrap items-center justify-center'>
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
