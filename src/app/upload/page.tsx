'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faImage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser } from 'aws-amplify/auth';
import { downloadData, list, remove, uploadData } from 'aws-amplify/storage';
import JSZip from 'jszip';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { RecipeDataDAO } from '../datastore/recipe/data';
import { RecipeImageDAO } from '../datastore/recipe/image';
import { UserDAO } from '../datastore/user/cognito';
import { RecipeData } from '../types/recipe/data';
import { RecipeMetaData, TotalRecipeMetaData } from '../types/recipe/metadata';

const getDefaultRecipeData = (): RecipeData => ({
    recipeName: '',
    recipeDesc: '',
    recipeDateMilliseconds: new Date().getTime(),
    recipeIngredients: new Array(defaultIngredientsCount).fill(''),
    recipeSteps: new Array(defaultStepsCount).fill(''),
});

const getDefaultRecipeMetaData = (): RecipeMetaData => ({
    isPrivate: false,
    recipeAuthor: null,
});

// For simplicity and ease of querying I'm using the recipe name as the folder ID
// Obviously this is a big no-no for a real app, but with the limited user-set the worst case scenario is a malformed recipe
const sanitizeRecipeName = (s: string): string => {
    return s.replaceAll(/[\/\n\t\r]/g, '');
};

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'w-full list-inside list-decimal text-sm/6 text-center sm:text-left';
const buttonClass = `hover:${gray.secondary} text-white px-2 rounded-xs transition duration-300 ease-in-out`;
const inputClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

const defaultIngredientsCount = 1;
const defaultStepsCount = 1;

export default function RecipeForm() {
    const [submitting, setSubmitting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [useMultibox, setUseMultibox] = useState(false);

    const [existingRecipes, setExistingRecipes] = useState<string[] | null>(null);
    const [existingRecipeToImport, setExistingRecipeToImport] = useState<string>('');

    const [user, setUser] = useState<AuthUser | null>(null);

    const [recipeImage, setRecipeImage] = useState<File | string | null>(null);

    const [recipeMetaData, setRecipeMetaData] = useState<RecipeMetaData>(getDefaultRecipeMetaData());
    const { isPrivate, recipeAuthor } = recipeMetaData;

    const [recipeState, setRecipeState] = useState<RecipeData>(getDefaultRecipeData());
    const { recipeName, recipeDesc, recipeDateMilliseconds, recipeIngredients, recipeSteps } = recipeState;

    const [recipeUrl, setRecipeUrl] = useState<string | null>(null);

    useEffect(() => {
        async function loadSessionRecipe(): Promise<RecipeData | null> {
            const inProgressRecipe = localStorage.getItem('in-progress-recipe');
            if (inProgressRecipe !== null) {
                console.log(`In progress recipe data found: ${inProgressRecipe}`);
                const inProgressRecipeData: RecipeData = JSON.parse(inProgressRecipe);
                if (
                    [
                        inProgressRecipeData.recipeName,
                        inProgressRecipeData.recipeDesc,
                        ...inProgressRecipeData.recipeIngredients,
                        ...inProgressRecipeData.recipeSteps,
                    ].some((s) => s.length !== 0)
                ) {
                    window.alert('Found input from a previous session, loading it in!');
                    return {
                        recipeName: inProgressRecipeData.recipeName ?? recipeName,
                        recipeDesc: inProgressRecipeData.recipeDesc ?? recipeDesc,
                        recipeDateMilliseconds: inProgressRecipeData.recipeDateMilliseconds ?? recipeDateMilliseconds,
                        recipeIngredients: inProgressRecipeData.recipeIngredients ?? recipeIngredients,
                        recipeSteps: inProgressRecipeData.recipeSteps ?? recipeSteps,
                    };
                }
            }
            return null;
        }

        async function loadRecipes(topLevelFolder: string): Promise<string[]> {
            try {
                const existingTotalMetaData: TotalRecipeMetaData = JSON.parse(
                    await (await downloadData({ path: `${topLevelFolder}/metadata.json` }).result).body.text()
                );
                return Object.keys(existingTotalMetaData);
            } catch (e) {
                window.alert(`Could not load recipes.`);
                console.warn(`Could not load existing recipe metadata: ${e}`);
                return [];
            }
        }

        async function loadRecipeIfInUrl() {
            const searchParams = new URLSearchParams(document.location.search);
            const recipeDirName = searchParams.get('recipename');
            const privateParam = searchParams.get('private') === 'true';

            if (recipeDirName === null) {
                return console.log('No recipe params in URL');
            }

            console.log('Found recipe params in URL, attempting download');

            await RecipeDataDAO.get(recipeDirName, privateParam)
                .then(setRecipeState)
                .catch(window.alert);

            await RecipeImageDAO.getUrl(recipeDirName, privateParam)
                .then(setRecipeImage)
                .catch((e) => {
                    console.warn(e);
                    setRecipeImage(null);
                });
        }

        (async () => {
            const inProgressRecipeData = await loadSessionRecipe();
            if (inProgressRecipeData !== null) {
                setRecipeState(inProgressRecipeData);
            }

            const currentUser = await UserDAO.getCurrentUser();
            setUser(currentUser);

            if (UserDAO.isAuthenticated(currentUser)) {
                setExistingRecipes([
                    ...(await loadRecipes('recipe-metadata')),
                    ...(await loadRecipes('private-recipe-metadata')),
                ]);

                if (inProgressRecipeData === null) {
                    await loadRecipeIfInUrl();
                }
            }
        })();
    }, []);

    useEffect(() => {
        console.log('Saving recipe data to local storage');

        localStorage.setItem('in-progress-recipe', JSON.stringify(recipeState));
    }, [recipeState]);

    async function handleImport() {
        if (!existingRecipeToImport) {
            return window.alert('No recipe name provided');
        }

        const privateParam = ['y', 'Y', 'yes', 'Yes'].includes(window.prompt('Is this recipe private? (Yes/No)') ?? '');

        await RecipeDataDAO.get(existingRecipeToImport, privateParam)
            .then(setRecipeState)
            .catch(window.alert);

        await RecipeImageDAO.getUrl(existingRecipeToImport, privateParam)
            .then(setRecipeImage)
            .catch((e) => {
                console.warn(e);
                setRecipeImage(null);
            });
    }

    async function handleUpload() {
        if ([recipeName, recipeDesc, ...recipeIngredients, ...recipeSteps].some((s) => s.length === 0)) {
            window.alert(
                `Missing input for the following fields: ${Object.entries({
                    recipeName,
                    recipeDesc,
                    recipeIngredients,
                    recipeSteps,
                })
                    .filter(([_, v]) =>
                        typeof v === 'object' ? (v as string[]).some((s) => s.length === 0) : v.length === 0
                    )
                    .map(([k, _]) => k)}`
            );
            return console.warn(`Invalid input: recipeState=${JSON.stringify(recipeState)}`);
        }

        const recipeDirName = recipeName;
        const topLevelFolder = isPrivate ? 'private-recipe-data' : 'recipe-data';
        const directory = `${topLevelFolder}/${recipeDirName}`;
        const recipeImagePath = `${directory}/image.png`;

        console.log('Checking recipe existence...');

        if (
            (await RecipeDataDAO.exists(recipeName, isPrivate)) &&
            !window.confirm('Recipe already exists, would you like to overwrite it?')
        ) {
            return console.warn(`Rejecting upload for existing recipe: recipeState=${JSON.stringify(recipeState)}`);
        }

        RecipeDataDAO.put(recipeState, isPrivate);

        if (recipeImage !== null && typeof recipeImage === 'object') {
            RecipeImageDAO.put(recipeImage, recipeName, isPrivate);
        }

        const uploadedRecipeUrl =
            window.location.href.split('upload')[0] +
            'recipe?recipename=' +
            recipeDirName +
            (isPrivate ? '&private=true' : '');

        setRecipeUrl(uploadedRecipeUrl);

        console.log('Updating metadata...');

        const totalMetaDataPath = `${isPrivate ? 'private-recipe-metadata' : 'recipe-metadata'}/metadata.json`;

        let existingTotalMetaData: TotalRecipeMetaData;
        try {
            existingTotalMetaData = JSON.parse(
                await (await downloadData({ path: totalMetaDataPath }).result).body.text()
            );
        } catch (e) {
            console.warn(`Could not load existing recipe metadata: ${e}`);
            existingTotalMetaData = {};
        }

        console.log(`Uploading metadata to ${totalMetaDataPath}...`);

        uploadData({
            path: totalMetaDataPath,
            data: JSON.stringify({ ...existingTotalMetaData, [recipeName]: recipeMetaData }),
        });

        console.log(`Checking if duplicate data for ${directory} needs cleanup...`);

        const otherDirectory = `${isPrivate ? 'recipe-data' : 'private-recipe-data'}/${recipeDirName}`;
        const otherRecipeDataPath = `${otherDirectory}/data.json`;

        if (await RecipeDataDAO.exists(recipeName, !isPrivate)) {
            try {
                console.log(`Removing ${otherRecipeDataPath}...`);
                await remove({ path: otherRecipeDataPath });
            } catch (e) {
                console.error(`Could not clean up data: ${e}`);
            }

            try {
                const otherRecipeImagePath = `${otherDirectory}/image.png`;
                console.log(`Removing ${otherRecipeImagePath}...`);
                await remove({ path: otherRecipeImagePath });
            } catch (e) {
                console.warn(`Could not clean up image: ${e}`);
            }

            try {
                const otherTotalMetaDataPath = `${
                    isPrivate ? 'recipe-metadata' : 'private-recipe-metadata'
                }/metadata.json`;
                const otherEistingTotalMetaData = JSON.parse(
                    await (await downloadData({ path: otherTotalMetaDataPath }).result).body.text()
                );
                console.log(`Removing metadata for ${recipeName} from ${otherTotalMetaDataPath}...`);
                delete otherEistingTotalMetaData[recipeName];
                uploadData({
                    path: otherTotalMetaDataPath,
                    data: JSON.stringify(otherEistingTotalMetaData),
                });
            } catch (e) {
                console.warn(`Could not clean up existing recipe metadata: ${e}`);
            }
        } else {
            console.log('No duplicate data found');
        }
    }

    const disabled = submitting || importing;

    return (
        <div className='font-sans flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 md:px-[20%]'>
            <Authenticator hideSignUp>
                {({ signOut }) => (
                    <form className='font-mono flex flex-col gap-[32px] row-start-2 w-full max-w-full'>
                        <div
                            id='Title'
                            className='flex flex-1 flex-col row-start-2 items-center sm:items-center md:text-5xl text-3xl w-full max-w-full'
                        >
                            <textarea
                                value={recipeName}
                                placeholder='Recipe name'
                                onChange={(e) =>
                                    setRecipeState({ ...recipeState, recipeName: sanitizeRecipeName(e.target.value) })
                                }
                                className='text-center pb-4 wrap-break-word bg-gray-800 p-4 rounded-sm'
                            />
                            {recipeImage !== null ? (
                                <Image
                                    src={
                                        typeof recipeImage === 'string' ? recipeImage : URL.createObjectURL(recipeImage)
                                    }
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
                                        setRecipeImage(event.target.files[0]);
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
                            <div id='Date' className='flex w-full flex-col gap-[2px] row-start-2 items-center'>
                                <div id='Date title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>
                                        Born on {new Date(recipeDateMilliseconds).toLocaleDateString()}
                                    </p>
                                    <button
                                        className={buttonClass}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setRecipeState({
                                                ...recipeState,
                                                recipeDateMilliseconds: new Date().getTime(),
                                            });
                                        }}
                                    >
                                        Reset
                                    </button>
                                </div>
                                <textarea
                                    value={recipeDesc}
                                    placeholder='Recipe description'
                                    onChange={(e) => setRecipeState({ ...recipeState, recipeDesc: e.target.value })}
                                    className={inputClass}
                                />
                                <textarea
                                    value={recipeAuthor ?? ''}
                                    placeholder='Recipe author'
                                    onChange={({ target: { value } }) =>
                                        setRecipeMetaData({
                                            ...recipeMetaData,
                                            recipeAuthor: value.length > 0 ? value : null,
                                        })
                                    }
                                    className={inputClass}
                                />
                            </div>
                            <hr />
                            <div id='Multibox' className='flex flex-col w-full gap-[2px] row-start-2 items-start'>
                                <div
                                    id='Multibox title'
                                    className='flex flex-row items-center gap-4 w-full justify-start'
                                >
                                    <label htmlFor='isPrivate' className='flex-grow text-xl md:text-3xl text-left'>
                                        Use multiple input boxes for ingredients/steps?
                                    </label>
                                </div>
                                <div
                                    id='Multibox input'
                                    className='flex flex-row items-center gap-4 w-full justify-start'
                                >
                                    <p className='text-left'>{useMultibox ? 'Yes' : 'No'}</p>
                                    <input
                                        id='isMultibox'
                                        type='checkbox'
                                        className='pb-4 cursor-pointer'
                                        style={{ width: '2em', height: '2em' }}
                                        onChange={(e) => setUseMultibox(e.target.checked)}
                                    />
                                </div>
                            </div>
                            <div id='Ingredients' className='flex w-full flex-col gap-[2px] row-start-2 items-center'>
                                <p className='text-xl text-center text-left w-full p-2 bg-yellow-800 mb-2 rounded-sm'>
                                    Press <code>Enter</code> on a step/ingredient to add another step/ingredient. Or,
                                    paste multiline text (separated with a newline) to add multiple steps/ingredients at
                                    once.
                                </p>
                                <div id='Ingredients title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>Ingredients</p>
                                    {useMultibox && (
                                        <button
                                            className={buttonClass}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setRecipeState({
                                                    ...recipeState,
                                                    recipeIngredients: [...recipeIngredients, ''],
                                                });
                                            }}
                                        >
                                            Add ingredient
                                        </button>
                                    )}
                                </div>
                                {useMultibox ? (
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
                                                    onChange={(e) => {
                                                        setRecipeState({
                                                            ...recipeState,
                                                            recipeIngredients: [
                                                                ...recipeIngredients.slice(0, i),
                                                                ...e.target.value
                                                                    .split('\n')
                                                                    // Filter out non-ASCII chars
                                                                    .map((s) => s.replace(/[^\x00-\x7F]/g, '')),
                                                                ...recipeIngredients.slice(i + 1),
                                                            ],
                                                        });
                                                    }}
                                                />
                                                {recipeIngredients.length > 1 && (
                                                    <button
                                                        className={buttonClass}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setRecipeState({
                                                                ...recipeState,
                                                                recipeIngredients: [
                                                                    ...recipeIngredients.slice(0, i),
                                                                    ...recipeIngredients.slice(i + 1),
                                                                ],
                                                            });
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <textarea
                                        value={recipeIngredients.join('\n')}
                                        placeholder='Ingredients'
                                        className={inputClass}
                                        onChange={(e) => {
                                            setRecipeState({
                                                ...recipeState,
                                                recipeIngredients: e.target.value
                                                    .split('\n')
                                                    // Filter out non-ASCII chars
                                                    .map((s) => s.replace(/[^\x00-\x7F]/g, '')),
                                            });
                                        }}
                                    />
                                )}
                            </div>
                            <div id='Steps' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                                <div id='Steps title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>Steps</p>
                                    {useMultibox && (
                                        <button
                                            className={buttonClass}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setRecipeState({
                                                    ...recipeState,
                                                    recipeSteps: [...recipeSteps, ''],
                                                });
                                            }}
                                        >
                                            Add step
                                        </button>
                                    )}
                                </div>
                                {useMultibox ? (
                                    <ul className={listClass}>
                                        {recipeSteps.map((ingredient, i) => (
                                            <li key={i} className='flex flex-row text-sm/6 text-center text-left'>
                                                <textarea
                                                    value={ingredient}
                                                    placeholder={`Step ${i + 1}`}
                                                    className={inputClass}
                                                    onChange={(e) =>
                                                        setRecipeState({
                                                            ...recipeState,
                                                            recipeSteps: [
                                                                ...recipeSteps.slice(0, i),
                                                                ...e.target.value
                                                                    .split('\n')
                                                                    // Filter out non-ASCII chars
                                                                    .map((s) => s.replace(/[^\x00-\x7F]/g, '')),
                                                                ...recipeSteps.slice(i + 1),
                                                            ],
                                                        })
                                                    }
                                                />
                                                {recipeSteps.length > 1 && (
                                                    <button
                                                        className={buttonClass}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setRecipeState({
                                                                ...recipeState,
                                                                recipeSteps: [
                                                                    ...recipeSteps.slice(0, i),
                                                                    ...recipeSteps.slice(i + 1),
                                                                ],
                                                            });
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <textarea
                                        value={recipeSteps.join('\n')}
                                        placeholder='Steps'
                                        className={inputClass}
                                        onChange={(e) => {
                                            setRecipeState({
                                                ...recipeState,
                                                recipeSteps: e.target.value
                                                    .split('\n')
                                                    // Filter out non-ASCII chars
                                                    .map((s) => s.replace(/[^\x00-\x7F]/g, '')),
                                            });
                                        }}
                                    />
                                )}
                            </div>
                            <div id='Private' className='flex flex-col w-full gap-[2px] row-start-2 items-start'>
                                <div
                                    id='Private title'
                                    className='flex flex-row items-center gap-4 w-full justify-start'
                                >
                                    <label htmlFor='isPrivate' className='flex-grow text-xl md:text-3xl text-left'>
                                        Mark recipe private?
                                    </label>
                                </div>
                                <div
                                    id='Private input'
                                    className='flex flex-row items-center gap-4 w-full justify-start'
                                >
                                    <p className='text-left'>{isPrivate ? 'Yes' : 'No'}</p>
                                    <input
                                        id='isPrivate'
                                        type='checkbox'
                                        className='pb-4 cursor-pointer'
                                        style={{ width: '2em', height: '2em' }}
                                        onChange={(e) =>
                                            setRecipeMetaData({ ...recipeMetaData, isPrivate: e.target.checked })
                                        }
                                    />
                                </div>
                            </div>
                            <div id='Import' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                                <div id='Import title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>
                                        Import existing recipe (optional)
                                    </p>
                                </div>
                                <div className='flex flex-row w-full text-sm/6 text-center text-left'>
                                    <input
                                        list='existing-recipes'
                                        className={inputClass}
                                        placeholder='Select existing recipe'
                                        value={existingRecipeToImport}
                                        onChange={(e) => setExistingRecipeToImport(e.target.value)}
                                        disabled={disabled}
                                    />
                                    <datalist id='existing-recipes'>
                                        {existingRecipes?.map((recipe, i) => (
                                            <option key={i} value={recipe} />
                                        ))}
                                    </datalist>
                                    <button
                                        disabled={disabled}
                                        className={buttonClass}
                                        onClick={async (e) => {
                                            e.preventDefault();

                                            if (disabled) {
                                                return console.warn('Operation in progress, cannot import');
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
                                    disabled={disabled}
                                    className={`bg-${disabled ? 'blue' : 'gray'}-300 hover:bg-${
                                        disabled ? 'blue' : 'gray'
                                    }-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                                    onClick={async (e) => {
                                        e.preventDefault();

                                        if (disabled) {
                                            return console.warn('Operation in progress, cannot submit');
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
                                    disabled={disabled}
                                    className={`bg-${disabled ? 'blue' : 'yellow'}-800 hover:bg-${
                                        disabled ? 'blue' : 'yellow'
                                    }-600 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                                    onClick={async (e) => {
                                        e.preventDefault();

                                        if (disabled) {
                                            return console.warn('Operation in progress, cannot clear form');
                                        }

                                        if (!window.confirm('Completely clear the upload form?')) {
                                            return console.warn('Rejecting clear operation');
                                        }

                                        setRecipeState(getDefaultRecipeData());
                                        setRecipeImage(null);
                                    }}
                                >
                                    Clear form
                                </button>
                                <button
                                    className={`bg-${disabled ? 'blue' : 'yellow'}-800 hover:bg-${
                                        disabled ? 'blue' : 'yellow'
                                    }-600 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        if (window.confirm('Download ALL recipes? This will take a while.')) {
                                            console.log(`Listing all data...`);

                                            const publicListResult = await list({
                                                path: 'recipe-data/',
                                                options: { listAll: true },
                                            });
                                            const privateListResult = await list({
                                                path: 'private-recipe-data/',
                                                options: { listAll: true },
                                            });
                                            const allItems = [...privateListResult.items, ...publicListResult.items];

                                            const allResults = await Promise.all(
                                                allItems.map(async (item) => {
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
                                    className={`bg-${disabled ? 'blue' : 'red'}-900 hover:bg-${
                                        disabled ? 'blue' : 'red'
                                    }-700 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        if (
                                            window.confirm(
                                                "Sync recipe list displayed on the homepage? You only need to do this if the list isn't displaying new recipes."
                                            )
                                        ) {
                                            async function loadExistingRecipes(
                                                topLevelFolder: string
                                            ): Promise<string[]> {
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
                                                        result.excludedSubpaths?.map(
                                                            (recipePath) =>
                                                                recipePath.match(`${topLevelFolder}\/(.*)\/`)?.at(1) ??
                                                                '<unknown>'
                                                        ) ?? []
                                                    );
                                                } catch (e) {
                                                    window.alert(`Could not retrieve recipes: ${e}`);
                                                    return [];
                                                }
                                            }

                                            console.log(`Listing all data...`);

                                            const publicListResult = await loadExistingRecipes('recipe-data');
                                            const privateListResult = await loadExistingRecipes('private-recipe-data');

                                            console.log('Updating public metadata...');

                                            const publicMetaData: TotalRecipeMetaData = publicListResult.reduce(
                                                (acc, s) => ({ ...acc, [s]: { isPrivate: false } }),
                                                {}
                                            );
                                            uploadData({
                                                path: 'recipe-metadata/metadata.json',
                                                data: JSON.stringify(publicMetaData),
                                            });

                                            console.log('Updating private metadata...');

                                            const privateMetaData: TotalRecipeMetaData = privateListResult.reduce(
                                                (acc, s) => ({ ...acc, [s]: { isPrivate: true } }),
                                                {}
                                            );
                                            uploadData({
                                                path: 'private-recipe-metadata/metadata.json',
                                                data: JSON.stringify(privateMetaData),
                                            });

                                            console.log(`Synchronization complete: `, publicMetaData, privateMetaData);
                                        }
                                    }}
                                >
                                    Manually sync recipe list
                                </button>
                                <button
                                    className='bg-red-900 hover:bg-red-700 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
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
            <footer className='flex flex-row justify-items-center items-center'>
                <a
                    className='flex-1 hover:underline hover:underline-offset-4 text-center'
                    href='https://www.griffinkupsaw.com/griffins-recipes'
                    style={{ width: '5em' }}
                >
                    Home
                </a>
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
                    style={{ width: '5em' }}
                >
                    Click me!
                </a>
            </footer>
        </div>
    );
}
