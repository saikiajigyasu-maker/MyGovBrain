'use client';

import { useEffect, useState } from 'react';

export default function AuthForm({ next }) {
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    useEffect(() => {
        let active = true;
        fetch('/api/auth/session')
            .then(async (response) => {
                if (!response.ok) throw new Error('Could not validate the current session.');
                return response.json();
            })
            .then((result) => {
                if (active) setAuthenticated(result.authenticated);
            })
            .catch(() => {
                if (active) setError('We could not check your session. Refresh this page and try again.');
            });

        return () => {
            active = false;
        };
    }, []);

    async function sendLink(event) {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch('/api/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, next })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Could not send a sign-in link.');
            setMessage(result.message);
            setEmailSent(true);
        } catch {
            setError('We could not send the link. Check your connection and try again.');
        } finally {
            setBusy(false);
        }
    }

    async function verifyCode(event) {
        event.preventDefault();
        setBusy(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token })
            });
            if (!response.ok) throw new Error('Could not verify the sign-in code.');
            window.location.assign(next);
        } catch {
            setError('That code could not be verified. Check it and try again, or request a new code.');
        } finally {
            setBusy(false);
        }
    }

    async function signOut() {
        setBusy(true);
        setError('');
        try {
            const response = await fetch('/api/auth/sign-out', { method: 'POST' });
            if (!response.ok) throw new Error('Could not sign out.');
            setAuthenticated(false);
            setMessage('You have signed out.');
        } catch {
            setError('We could not sign you out. Please try again.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="account-form-wrap" aria-label="Email sign-in">
            {authenticated ? (
                <div className="auth-signed-in">
                    <p role="status">You are signed in.</p>
                    <button className="button button-outline" type="button" onClick={signOut} disabled={busy}>
                        {busy ? 'Please wait...' : 'Sign out'}
                    </button>
                </div>
            ) : emailSent ? (
                <form className="auth-form" onSubmit={verifyCode}>
                    <p role="status">{message}</p>
                    <label htmlFor="auth-token">Six-digit email code</label>
                    <input
                        id="auth-token"
                        name="token"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        minLength={6}
                        maxLength={6}
                        value={token}
                        onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                    />
                    <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                        {busy ? 'Checking...' : 'Verify code'}
                    </button>
                    <button className="inline-button" type="button" onClick={sendLink} disabled={busy}>
                        Resend code
                    </button>
                </form>
            ) : (
                <form className="auth-form" onSubmit={sendLink}>
                    <label htmlFor="auth-email">Email address</label>
                    <input
                        id="auth-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                    <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                        {busy ? 'Sending...' : 'Send sign-in link'}
                    </button>
                    <p className="form-message" role="status" aria-live="polite">{message}</p>
                    {message && (
                        <button className="inline-button" type="button" disabled={busy} onClick={sendLink}>
                            Resend email
                        </button>
                    )}
                </form>
            )}
            <p className="form-message" role="alert">{error}</p>
        </section>
    );
}
