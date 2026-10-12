import Link from 'next/link';
import { SiteShell } from '../../components/SiteShell';

export const metadata = {
    title: 'Download and roadmap | Softcore',
    description: 'See Softcore development status, roadmap, and public release information.'
};

export default function DownloadPage() {
    return (
        <SiteShell activePage="download">
            <main className="page-width inner-page releases-page" id="main-content">
                <section className="page-heading download-heading">
                    <p className="eyebrow"><span className="status-dot" /> DEVELOPMENT LOG</p>
                    <h1>Progress, without the guesswork.</h1>
                    <p>Release information belongs next to the build it describes. Here is the current status, what is being explored, and where verified downloads will appear.</p>
                </section>
                <section className="release-card">
                    <div className="release-card-top"><span className="release-label"><span className="status-dot" /> DEVELOPMENT STATUS</span><span className="version-chip">NO PUBLIC VERSION</span></div>
                    <div className="release-card-body">
                        <div><p className="eyebrow">LATEST PUBLIC BUILD</p><h2>Nothing to download yet.</h2><p>Softcore is in development. No installer has been published or verified.</p></div>
                        <span className="release-status-large"><i className="signal-dot amber" /> IN DEVELOPMENT</span>
                    </div>
                    <div className="release-card-meta"><span>VERSION<strong>Not announced</strong></span><span>PLATFORM<strong>Not confirmed</strong></span><span>INSTALLER<strong>Not available</strong></span><span>CHECKSUM<strong>Will be listed with a release</strong></span></div>
                </section>
                <section className="roadmap-section" id="roadmap">
                    <div className="section-title"><div><p className="eyebrow">ROADMAP</p><h2>What we are working toward</h2></div><span className="section-index">01 / 03</span></div>
                    <div className="roadmap-list">
                        <article className="roadmap-row roadmap-current"><span className="roadmap-marker"><i /></span><span className="roadmap-phase">01 / FOUNDATION</span><div><h3>Shape the investigation experience</h3><p>Define how file identity, evidence, and uncertainty fit together in a clear desktop workflow.</p></div><span className="roadmap-state">IN PROGRESS</span></article>
                        <article className="roadmap-row"><span className="roadmap-marker"><i /></span><span className="roadmap-phase">02 / VALIDATION</span><div><h3>Test the details that matter</h3><p>Evaluate supported file types, privacy boundaries, and how analysis context is presented.</p></div><span className="roadmap-state">PLANNED</span></article>
                        <article className="roadmap-row"><span className="roadmap-marker"><i /></span><span className="roadmap-phase">03 / FIRST BUILD</span><div><h3>Publish a verifiable release</h3><p>Share supported systems, installer details, checksums, and release notes together.</p></div><span className="roadmap-state">NOT SCHEDULED</span></article>
                    </div>
                </section>
                <section className="version-section">
                    <div className="section-title"><div><p className="eyebrow">VERSION HISTORY</p><h2>Published builds</h2></div><span className="version-count">0 PUBLIC RELEASES</span></div>
                    <div className="version-empty"><span className="empty-mark">+</span><div><h3>No release notes yet</h3><p>When a public build is ready, this page will include its version, date, supported operating systems, verified download, checksum, and changes.</p></div></div>
                </section>
                <section className="release-help"><div><p className="eyebrow">FOLLOW THE PROJECT</p><h2>Nothing to sign up for.</h2></div><p>We are not collecting email addresses or account details on this frontend. Project status and release information will be posted here.</p><Link className="text-link" href="/account">About access <span aria-hidden="true">&#8594;</span></Link></section>
            </main>
        </SiteShell>
    );
}
