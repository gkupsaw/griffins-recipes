'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { faImage } from '@fortawesome/free-regular-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AuthUser, getCurrentUser } from 'aws-amplify/auth';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const gray = {
    primary: 'bg-gray-800',
    secondary: 'bg-gray-500',
};

const listClass = 'w-full list-inside list-decimal text-sm/6 text-center sm:text-left';
const buttonClass = `my-2 hover:${gray.secondary} text-white px-2 rounded-xs transition duration-300 ease-in-out`;
const textAreaClass = `text-sm/6 text-center text-left w-full ${gray.primary} p-2 my-1 rounded-sm`;

export default function RecipeForm() {
    const recipeDate = new Date();

    const [user, setUser] = useState<AuthUser | null>(null);

    const [recipeName, setRecipeName] = useState('');
    const [recipeDesc, setRecipeDesc] = useState('');
    const [recipeImage, setRecipeImage] = useState<File | null>(null);

    const [ingredients, setIngredients] = useState(['']);
    const [steps, setSteps] = useState(['']);
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

    return (
        <Authenticator>
            <div className='font-sans grid items-center justify-items-center min-h-screen'>
                <form className='font-mono flex flex-col gap-[32px] row-start-2 sm:items-start'>
                    <div
                        id='Title'
                        className='flex flex-1 flex-col gap-[16px] row-start-2 items-center sm:items-center text-5xl'
                    >
                        <input
                            value={recipeName}
                            placeholder='Recipe name'
                            onChange={(e) => setRecipeName(e.target.value)}
                            className='text-center'
                        />
                        {recipeImage ? (
                            <Image
                                src={URL.createObjectURL(recipeImage)}
                                alt='Uploaded recipe photo'
                                height={360}
                                width={360}
                                priority
                            />
                        ) : (
                            <FontAwesomeIcon icon={faImage} style={{ width: 360, height: 360 }} />
                        )}

                        <input
                            type='file'
                            id='recipe-photo'
                            name='Recipe photo'
                            accept='image/*'
                            hidden
                            onChange={(event) => {
                                if (event.target.files && event.target.files[0]) {
                                    setRecipeImage(event.target.files[0]);
                                }
                            }}
                        />
                        <label
                            htmlFor='recipe-photo'
                            className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
                        >
                            Upload photo
                        </label>
                    </div>
                    <div
                        id='Content'
                        className='flex w-full flex-col gap-[8px] row-start-2 items-center sm:items-start'
                    >
                        <p className='text-3xl text-center text-left'>Born on {recipeDate.toLocaleDateString()}</p>
                        <textarea
                            value={recipeDesc}
                            placeholder='Recipe description'
                            onChange={(e) => setRecipeDesc(e.target.value)}
                            className={textAreaClass}
                        />
                        <hr />
                        <div
                            id='Ingredients'
                            className='flex w-full flex-col gap-[2px] row-start-2 items-center sm:items-start'
                        >
                            <div id='Ingredients title' className='flex flex-row w-full items-stretch'>
                                <p className='flex-grow text-3xl text-center text-left'>Ingredients</p>
                                <button
                                    className={buttonClass}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIngredients([...ingredients, '']);
                                    }}
                                >
                                    Add ingredient
                                </button>
                            </div>
                            <ul className={listClass}>
                                {ingredients.map((ingredient, i) => (
                                    <li key={i} className='flex flex-row items-left text-sm/6 text-center text-left'>
                                        <textarea
                                            value={ingredient}
                                            placeholder={`Ingredient ${i + 1}`}
                                            className={textAreaClass}
                                            onChange={(e) =>
                                                setIngredients([
                                                    ...ingredients.slice(0, i),
                                                    e.target.value,
                                                    ...ingredients.slice(i + 1),
                                                ])
                                            }
                                        />
                                        {ingredients.length > 1 && (
                                            <button
                                                className={buttonClass}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setIngredients([
                                                        ...ingredients.slice(0, i),
                                                        ...ingredients.slice(i + 1),
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
                            id='Steps'
                            className='flex flex-col w-full gap-[2px] row-start-2 items-center sm:items-start'
                        >
                            <div id='Steps title' className='flex flex-row w-full items-stretch'>
                                <p className='flex-grow text-3xl text-center text-left'>Steps</p>
                                <button
                                    className={buttonClass}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setSteps([...steps, '']);
                                    }}
                                >
                                    Add step
                                </button>
                            </div>
                            <ul className={listClass}>
                                {steps.map((ingredient, i) => (
                                    <li key={i} className='flex flex-row text-sm/6 text-center text-left'>
                                        <textarea
                                            value={ingredient}
                                            placeholder={`Step ${i + 1}`}
                                            className={textAreaClass}
                                            onChange={(e) =>
                                                setSteps([...steps.slice(0, i), e.target.value, ...steps.slice(i + 1)])
                                            }
                                        />
                                        {steps.length > 1 && (
                                            <button
                                                className={buttonClass}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSteps([...steps.slice(0, i), ...steps.slice(i + 1)]);
                                                }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div id='Upload' className='flex w-full gap-[2px] justify-center items-center mt-4 mb-16'>
                            <button
                                className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center text-sm cursor-pointer'
                                onClick={(e) => {
                                    e.preventDefault();
                                    console.log('submitting');
                                    // TODO: Upload image to S3 bucket under /img
                                    // TODO: Upload remaining data to S3 bucket under /data
                                }}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Authenticator>
    );
}
