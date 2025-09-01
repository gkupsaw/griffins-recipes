export default function RecipePage() {
    return (
        <div className='font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20'>
            <main className='flex flex-col gap-[32px] row-start-2 sm:items-start'>
                <div id='Title' className='flex flex-1 flex-col gap-[16px] row-start-2 items-center sm:items-center'>
                    <p className='font-mono text-5xl text-center'>Nothing to see here :)</p>
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
