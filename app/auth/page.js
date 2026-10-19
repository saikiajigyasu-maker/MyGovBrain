import AuthForm from './auth-form.js';
import { safeRedirectPath } from '../../lib/auth/safe-redirect.js';

export const metadata = {
    title: 'Sign in | MyGovBrain',
    description: 'Sign in securely to manage your personal MyGovBrain information.'
};

export default async function AuthPage({ searchParams }) {
    const params = await searchParams;
    const next = safeRedirectPath(params?.next);

    return (
        <main className="page-width account-layout" id="main-content">
            <section className="account-intro">
                <p className="eyebrow">MYGOVBRAIN ACCOUNT</p>
                <h1>Sign in with a secure email link.</h1>
                <p>Enter your email address and we will send a one-time sign-in link. You can browse public information without signing in.</p>
            </section>
            <AuthForm next={next} />
        </main>
    );
}
