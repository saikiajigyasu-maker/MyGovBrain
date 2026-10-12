'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../lib/supabase';

export default function AccountPanel() {
    const [mode, setMode] = useState('login');
    const [user, setUser] = useState(null);
    const [signedIn, setSignedIn] = useState(false);
    const [supabase, setSupabase] = useState(null);
    const [busy, setBusy] = useState(false);
    const [messages, setMessages] = useState({ login: '', signup: '', session: '' });
    const tabs = useRef([]);

    useEffect(() => {
        let client;
        try {
            client = getSupabaseBrowserClient();
            setSupabase(client);
        } catch (error) {
            setMessages((current) => ({ ...current, login: error.message }));
            return;
        }

        const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setSignedIn(Boolean(session));
        });
        client.auth.getSession().then(({ data, error }) => {
            if (error) throw error;
            setUser(data.session?.user ?? null);
            setSignedIn(Boolean(data.session));
        }).catch((error) => {
            setMessages((current) => ({ ...current, login: error.message }));
        });

        return () => subscription.unsubscribe();
    }, []);

    const setActiveMode = (nextMode) => {
        setMode(nextMode);
        setMessages((current) => ({ ...current, [nextMode]: '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formMode = form.dataset.authForm;
        setMessages((current) => ({ ...current, [formMode]: '' }));
        setBusy(true);

        try {
            if (!supabase) throw new Error('Supabase is not configured.');

            const values = Object.fromEntries(new FormData(form));
            if (formMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email: values.email,
                    password: values.password,
                    options: { data: { name: values.name.trim() } }
                });
                if (error) throw error;

                if (!data.session) {
                    setMessages((current) => ({
                        ...current,
                        signup: 'Check your email to confirm your account, then sign in.'
                    }));
                    return;
                }

                setUser(data.user);
                setSignedIn(true);
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: values.email,
                    password: values.password
                });
                if (error) throw error;
                setUser(data.user);
                setSignedIn(true);
            }
        } catch (error) {
            setMessages((current) => ({
                ...current,
                [formMode]: error.message || 'Could not connect to Supabase. Please try again later.'
            }));
        } finally {
            setBusy(false);
        }
    };

    const handleLogout = async () => {
        setMessages((current) => ({ ...current, session: '' }));
        setBusy(true);

        try {
            if (!supabase) throw new Error('Supabase is not configured.');
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            setMessages((current) => ({
                ...current,
                session: error.message || 'Could not sign out. Please try again.'
            }));
        } finally {
            setBusy(false);
        }
    };

    const handleTabKeyDown = (event) => {
        const currentIndex = tabs.current.indexOf(event.target);
        if (currentIndex === -1) return;

        let nextIndex;
        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.current.length;
        else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.current.length) % tabs.current.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.current.length - 1;
        else return;

        event.preventDefault();
        setActiveMode(nextIndex === 0 ? 'login' : 'signup');
        tabs.current[nextIndex]?.focus();
    };

    return (
        <section className="account-form-wrap" id="auth-panel" aria-label="Account sign in and registration">
            {!signedIn ? (
                <>
                    <div className="auth-tabs" role="tablist" aria-label="Choose account action" onKeyDown={handleTabKeyDown}>
                        <button ref={(element) => { tabs.current[0] = element; }} className={`auth-tab ${mode === 'login' ? 'active' : ''}`} id="login-tab" type="button" role="tab" aria-selected={mode === 'login'} aria-controls="login-form" tabIndex={mode === 'login' ? 0 : -1} onClick={() => setActiveMode('login')}>Sign in</button>
                        <button ref={(element) => { tabs.current[1] = element; }} className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} id="signup-tab" type="button" role="tab" aria-selected={mode === 'signup'} aria-controls="signup-form" tabIndex={mode === 'signup' ? 0 : -1} onClick={() => setActiveMode('signup')}>Create account</button>
                    </div>
                    <form className="auth-form" id="login-form" role="tabpanel" aria-labelledby="login-tab" data-auth-form="login" hidden={mode !== 'login'} onSubmit={handleSubmit}>
                        <p className="eyebrow">WELCOME BACK</p>
                        <h2>Sign in</h2>
                        <label htmlFor="login-email">Email address</label>
                        <input id="login-email" name="email" type="email" autoComplete="email" required />
                        <label htmlFor="login-password">Password</label>
                        <input id="login-password" name="password" type="password" autoComplete="current-password" required />
                        <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Sign in'}</button>
                        <p className="form-message" role="status" aria-live="polite">{messages.login}</p>
                        <p className="auth-switch-copy">New to Softcore? <button className="inline-button" type="button" onClick={() => setActiveMode('signup')}>Create an account</button></p>
                    </form>
                    <form className="auth-form" id="signup-form" role="tabpanel" aria-labelledby="signup-tab" data-auth-form="signup" hidden={mode !== 'signup'} onSubmit={handleSubmit}>
                        <p className="eyebrow">GET STARTED</p>
                        <h2>Create account</h2>
                        <label htmlFor="signup-name">Name</label>
                        <input id="signup-name" name="name" type="text" autoComplete="name" maxLength={100} required />
                        <label htmlFor="signup-email">Email address</label>
                        <input id="signup-email" name="email" type="email" autoComplete="email" maxLength={254} required />
                        <label htmlFor="signup-password">Password</label>
                        <input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                        <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait...' : 'Create account'}</button>
                        <p className="form-message" role="status" aria-live="polite">{messages.signup}</p>
                        <p className="auth-switch-copy">Already registered? <button className="inline-button" type="button" onClick={() => setActiveMode('login')}>Sign in</button></p>
                    </form>
                </>
            ) : (
                <section className="auth-signed-in">
                    <p className="eyebrow">ACCOUNT</p>
                    <h2>You&apos;re signed in.</h2>
                    <p>{user?.user_metadata?.name ? `${user.user_metadata.name} (${user.email})` : user?.email}</p>
                    <button className="button button-outline" type="button" onClick={handleLogout} disabled={busy}>{busy ? 'Please wait...' : 'Sign out'}</button>
                    <p className="form-message" role="status" aria-live="polite">{messages.session}</p>
                </section>
            )}
            <p className="auth-footnote">Your password is protected and never shown on this page.</p>
        </section>
    );
}
