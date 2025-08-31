import Script from 'next/script';
import { signInWithRedirect } from 'aws-amplify/auth';

signInWithRedirect({ provider: 'Google' });

export default function LoginPage() {
    return (
        <main className='flex items-center justify-center md:h-screen'>
            <div className='relative mx-auto flex w-full max-w-[400px] flex-col space-y-2.5 p-4 md:-mt-32'>
                <div className='flex h-20 w-full justify-center items-center rounded-lg p-3 md:h-36'>
                    <Script src='https://accounts.google.com/gsi/client' async />
                    <div
                        id='g_id_onload'
                        data-client_id='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'
                        data-auto_prompt='false'
                    ></div>
                    <div
                        className='flex g_id_signin'
                        data-type='standard'
                        data-size='large'
                        data-theme='outline'
                        data-text='sign_in_with'
                        data-shape='rectangular'
                        data-logo_alignment='left'
                    />
                </div>
            </div>
        </main>
    );
}
