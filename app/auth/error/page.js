import Link from 'next/link';

export const metadata = {
    title: 'Sign-in link unavailable | MyGovBrain'
};

export default async function AuthErrorPage({ searchParams }) {
    const params = await searchParams;
    const message = params?.reason === 'expired-link'
        ? 'This sign-in link has expired or has already been used. Request a new one to continue.'
        : 'This sign-in link could not be verified. Request a new one to continue.';

    return (
        <main className="page-width inner-page" id="main-content">
            <section className="page-heading">
                <h1>Sign-in link unavailable</h1>
                <p role="alert">{message}</p>
                <Link className="button button-primary" href="/auth">Request another link</Link>
            </section>
        </main>
    );
}
