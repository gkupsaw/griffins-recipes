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
    readonly isPrivate: boolean;
};

const getDefaultRecipeData = (): RecipeData => ({
    recipeName: '',
    recipeDesc: '',
    recipeDateMilliseconds: new Date().getTime(),
    recipeIngredients: new Array(defaultIngredientsCount).fill(''),
    recipeSteps: new Array(defaultStepsCount).fill(''),
    isPrivate: false,
});

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

    const [existingRecipes, setExistingRecipes] = useState<string[] | null>(null);
    const [existingRecipeToImport, setExistingRecipeToImport] = useState<string>('');

    const [user, setUser] = useState<AuthUser | null>(null);

    const [recipeImageFile, setRecipeImageFile] = useState<File | null>(null);
    const [recipeState, setRecipeState] = useState<RecipeData>(getDefaultRecipeData());
    const { recipeName, recipeDesc, recipeDateMilliseconds, recipeIngredients, recipeSteps, isPrivate } = recipeState;

    const [recipeUrl, setRecipeUrl] = useState<string | null>(null);

    useEffect(() => {
        async function loadSessionRecipe(inProgressRecipe: string) {
            console.log(`In progress recipe data found: ${inProgressRecipe}`);
            const inProgressRecipeData: RecipeData = JSON.parse(inProgressRecipe);
            if ([recipeName, recipeDesc, ...recipeIngredients, ...recipeSteps].some((s) => s.length !== 0)) {
                window.alert('Found input from a previous session, loading it in!');
                setRecipeState({
                    recipeName: inProgressRecipeData.recipeName ?? recipeName,
                    recipeDesc: inProgressRecipeData.recipeDesc ?? recipeDesc,
                    recipeDateMilliseconds: inProgressRecipeData.recipeDateMilliseconds ?? recipeDateMilliseconds,
                    recipeIngredients: inProgressRecipeData.recipeIngredients ?? recipeIngredients,
                    recipeSteps: inProgressRecipeData.recipeSteps ?? recipeSteps,
                    isPrivate: inProgressRecipeData.isPrivate ?? isPrivate,
                });
            }
        }

        async function loadExistingRecipes(topLevelFolder: string): Promise<string[]> {
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
                        (recipePath) => recipePath.match(`${topLevelFolder}\/(.*)\/`)?.at(1) ?? '<unknown>'
                    ) ?? []
                );
            } catch (e) {
                window.alert(`Could not retrieve recipes: ${e}`);
                return [];
            }
        }

        async function loadRecipeIfInUrl() {
            const searchParams = new URLSearchParams(document.location.search);
            const recipeDirName = searchParams.get('recipename');
            const topLevelFolder = searchParams.get('private') === 'true' ? 'private-recipe-data' : 'recipe-data';

            if (recipeDirName === null) {
                return console.log('No recipe params in URL');
            }

            console.log('Found recipe params in URL, attempting download');

            await downloadData({ path: `${topLevelFolder}/${recipeDirName}/data.json` })
                .result.then(({ body }) =>
                    body
                        .text()
                        .then((text) => {
                            const parsedRecipeData: RecipeData = JSON.parse(text);
                            setRecipeState(parsedRecipeData);
                        })
                        .catch((e) => window.alert(`Could not unpack recipe ${recipeDirName}: ${e}`))
                )
                .catch((e) => window.alert(`Could not retrieve recipe ${recipeDirName}: ${e}`));

            await downloadData({ path: `${topLevelFolder}/${recipeDirName}/image.png` })
                .result.then(({ body }) =>
                    body
                        .blob()
                        .then((image) => setRecipeImageFile(new File([image], 'image.png')))
                        .catch((e) => window.alert(`Could not unpack image for recipe ${recipeDirName}: ${e}`))
                )
                .catch((e) => {
                    console.warn(`Could not retrieve image for recipe ${recipeDirName}: ${e}`);
                });
        }

        (async () => {
            try {
                setUser(await getCurrentUser());
                console.log('Signed in');
            } catch (e) {
                console.log(`Could not retrieve current user: ${e}`);
                return;
            }

            setExistingRecipes([
                ...(await loadExistingRecipes('recipe-data')),
                ...(await loadExistingRecipes('private-recipe-data')),
            ]);

            await loadRecipeIfInUrl();

            const inProgressRecipe = localStorage.getItem('in-progress-recipe');
            if (inProgressRecipe !== null) {
                await loadSessionRecipe(inProgressRecipe);
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

        const topLevelFolder = ['y', 'Y', 'yes', 'Yes'].includes(
            window.prompt('Is this recipe private? (Yes/No)') ?? ''
        )
            ? 'private-recipe-data'
            : 'recipe-data';

        await downloadData({ path: `${topLevelFolder}/${existingRecipeToImport}/data.json` })
            .result.then(({ body }) =>
                body
                    .text()
                    .then((text) => {
                        const parsedRecipeData: RecipeData = JSON.parse(text);
                        setRecipeState(parsedRecipeData);
                    })
                    .catch((e) => window.alert(`Could not unpack recipe ${existingRecipeToImport}: ${e}`))
            )
            .catch((e) => window.alert(`Could not retrieve recipe ${existingRecipeToImport}: ${e}`));

        await downloadData({ path: `${topLevelFolder}/${existingRecipeToImport}/image.png` })
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
        if ([recipeName, recipeDesc, ...recipeIngredients, ...recipeSteps].some((s) => s.length === 0)) {
            window.alert('Invalid input, all fields must be filled');
            // window.alert(`Missing input for the following fields: ${Object.entries(recipeState)}`);
            return console.warn(`Invalid input: recipeState=${JSON.stringify(recipeState)}`);
        }

        const recipeDirName = recipeName;
        const topLevelFolder = isPrivate ? 'private-recipe-data' : 'recipe-data';
        const directory = `${topLevelFolder}/${recipeDirName}`;
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
            return console.warn(`Rejecting upload for existing recipe: recipeState=${JSON.stringify(recipeState)}`);
        }

        console.log('Uploading data...');

        uploadData({
            path: recipeDataPath,
            data: JSON.stringify(recipeState),
        });

        if (recipeImageFile !== null) {
            console.log('Uploading image...');

            uploadData({
                path: recipeImagePath,
                data: recipeImageFile,
            });
        }

        const uploadedRecipeUrl =
            window.location.href.split('upload')[0] +
            'recipe?recipename=' +
            recipeDirName +
            (isPrivate ? '&private=' : '');

        setRecipeUrl(uploadedRecipeUrl);
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
                                onChange={(e) => setRecipeState({ ...recipeState, recipeName: e.target.value })}
                                className='text-center pb-4 w-full max-w-full wrap-break-word'
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
                            </div>
                            <hr />
                            <div id='Ingredients' className='flex w-full flex-col gap-[2px] row-start-2 items-center'>
                                <p className='text-xl text-center text-left w-full p-2 bg-yellow-800 mb-2 rounded-sm'>
                                    Press <code>Enter</code> on an ingredient or step input to add another input. Or,
                                    paste multiline input (text separated with a newline) to add multiple items at once.
                                </p>
                                <div id='Ingredients title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>Ingredients</p>
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
                                                onChange={(e) => {
                                                    setRecipeState({
                                                        ...recipeState,
                                                        recipeIngredients: [
                                                            ...recipeIngredients.slice(0, i),
                                                            ...e.target.value
                                                                .split('\n')
                                                                // Filter out non-ASCII chars
                                                                .map((s) => s.replace(/[^\x00-\x7F]/g, ''))
                                                                .filter((s) => s.length > 0),
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
                            </div>
                            <div id='Steps' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                                <div id='Steps title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>Steps</p>
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
                                </div>
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
                                                                .map((s) => s.replace(/[^\x00-\x7F]/g, ''))
                                                                .filter((s) => s.length > 0),
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
                            </div>
                            <div id='Import' className='flex flex-col w-full gap-[2px] row-start-2 items-center'>
                                <div id='Import title' className='flex flex-row w-full items-stretch'>
                                    <p className='flex-grow text-xl md:text-3xl text-center text-left'>
                                        Import existing recipe
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
                                        {existingRecipes?.map((recipe) => (
                                            <option key={recipe} value={recipe} />
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
                                <div id='Import title' className='flex flex-row items-center gap-4'>
                                    <label htmlFor='isPrivate' className='text-2xl'>
                                        Mark recipe private?
                                    </label>
                                    <input
                                        id='isPrivate'
                                        type='checkbox'
                                        className='pb-4 wrap-break-word cursor-pointer'
                                        style={{
                                            width: '1.5em',
                                            height: '1.5em',
                                        }}
                                        onChange={(e) =>
                                            setRecipeState({ ...recipeState, isPrivate: e.target.checked })
                                        }
                                    />
                                </div>
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
                                    className={`bg-${disabled ? 'blue' : 'yellow'}-300 hover:bg-${
                                        disabled ? 'blue' : 'yellow'
                                    }-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer`}
                                    onClick={async (e) => {
                                        e.preventDefault();

                                        if (disabled) {
                                            return console.warn('Operation in progress, cannot clear form');
                                        }

                                        if (!window.confirm('Completely clear the upload form?')) {
                                            return console.warn('Rejecting clear operation');
                                        }

                                        setRecipeState(getDefaultRecipeData());
                                        setRecipeImageFile(null);
                                    }}
                                >
                                    Clear form
                                </button>
                                <button
                                    className='bg-yellow-300 hover:bg-yellow-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
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
