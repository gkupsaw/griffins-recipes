import Image from 'next/image';

export default function RecipePage() {
    return (
        <div className='font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20'>
            <main className='flex flex-col gap-[32px] row-start-2 sm:items-start'>
                <div id='Title' className='flex flex-1 flex-col gap-[16px] row-start-2 items-center sm:items-center'>
                    <p className='font-mono text-5xl text-center'>RECIPE_NAME</p>
                    <Image
                        className='dark'
                        src='data:image/jpeg;base64,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'
                        alt='Next.js logo'
                        width={480}
                        height={480}
                        priority
                    />
                </div>
                <div id='Content' className='flex w-full flex-col gap-[8px] row-start-2 items-center sm:items-start'>
                    <p className='font-mono text-3xl text-center text-left'>RECIPE_DATE</p>
                    <p className='font-mono text-sm/6 text-center text-left'>RECIPE_DESC</p>
                    <hr />
                    <div id='Ingredients' className='flex flex-col gap-[2px] row-start-2 items-center sm:items-start'>
                        <p className='font-mono text-3xl text-center text-left'>Ingredients</p>
                        <ul className='font-mono list-inside list-decimal text-sm/6 text-center sm:text-left'>
                            <li className='tracking-[-.01em]'>Lorem ipsum dolor.</li>
                        </ul>
                    </div>
                    <div id='Steps' className='flex flex-col gap-[2px] row-start-2 items-center sm:items-start'>
                        <p className='font-mono text-3xl text-center text-left'>Steps</p>
                        <ul className='font-mono list-inside list-decimal text-sm/6 text-center sm:text-left'>
                            <li className='tracking-[-.01em]'>Lorem ipsum dolor.</li>
                        </ul>
                    </div>
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
