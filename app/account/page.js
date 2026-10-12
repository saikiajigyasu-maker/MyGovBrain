import { SiteShell } from '../../components/SiteShell';
import AccountPanel from '../../components/AccountPanel';

export const metadata = {
    title: 'Account access | Softcore',
    description: 'Sign in or create a Softcore account.'
};

export default function AccountPage() {
    return (
        <SiteShell activePage="account">
            <main className="page-width account-layout" id="main-content">
                <section className="account-intro">
                    <p className="eyebrow"><span className="status-dot" /> SOFTCORE ACCOUNT</p>
                    <h1>Your workspace, in one place.</h1>
                    <p>Sign in to your account or create one to get started.</p>
                    <div className="account-note"><span aria-hidden="true">&#9432;</span><p>Account access is for the Softcore development service. This page does not scan or upload files.</p></div>
                </section>
                <AccountPanel />
            </main>
        </SiteShell>
    );
}
