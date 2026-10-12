import Link from 'next/link';
import { SiteShell } from '../components/SiteShell';

export const metadata = {
    title: 'Softcore | Application security analysis',
    description: 'Softcore is being built to help analyze suspicious applications and files on your computer.'
};

export default function HomePage() {
    return (
        <SiteShell activePage="home">
            <main id="main-content">
                <section className="hero page-width">
                    <div className="hero-copy">
                        <p className="eyebrow"><span className="status-dot" /> IN DEVELOPMENT <span className="eyebrow-divider">/</span> DESKTOP SECURITY</p>
                        <h1>Know what a file is doing <span>before you trust it.</span></h1>
                        <p className="hero-description">Review a file&apos;s identity, reputation, and behavior in one clear place.</p>
                        <div className="hero-actions">
                            <Link className="button button-primary" href="/approach">Our approach <span aria-hidden="true">&#8594;</span></Link>
                            <Link className="text-link" href="/download">Release status</Link>
                        </div>
                        <p className="fine-print">No public installer yet. This website does not scan or upload files.</p>
                    </div>
                    <div className="product-stage" aria-label="Concept preview of the Softcore application, not a live analysis">
                        <div className="stage-caption"><span>SOFTCORE DESKTOP</span><span>CONCEPT UI / 01</span></div>
                        <div className="product-window">
                            <div className="product-titlebar"><span className="window-brand"><span className="mini-mark">S</span> Softcore <span className="window-divider">/</span> Investigation</span><span className="window-dots" aria-hidden="true"><i /><i /><i /></span></div>
                            <div className="product-content">
                                <aside className="product-rail" aria-hidden="true"><span className="rail-mark active">S</span><span className="rail-glyph">&#9638;</span><span className="rail-glyph">&#9776;</span><span className="rail-glyph">&#9881;</span><span className="rail-avatar">JD</span></aside>
                                <div className="product-main">
                                    <div className="product-breadcrumb"><span>FILE REVIEW</span><span className="concept-chip">CONCEPT</span></div>
                                    <div className="sample-heading"><div><p className="sample-kicker">SAMPLE FILE</p><h2>setup-client.exe</h2></div><span className="verdict-chip">NOT CHECKED</span></div>
                                    <div className="sample-meta"><span>Windows app</span><span>12.8 MB</span><span>Added today</span></div>
                                    <div className="sample-grid">
                                        <section className="sample-stat"><span className="sample-label">FILE IDENTITY</span><strong>PE32+ application</strong><span>Unsigned publisher</span></section>
                                        <section className="sample-stat sample-stat-blue"><span className="sample-label">REPUTATION</span><strong>Not checked</strong><span>No live reputation data</span></section>
                                    </div>
                                    <div className="sample-hash"><span>SHA-256</span><code>9a71...c304</code><span className="hash-copy">DEMO</span></div>
                                    <div className="sample-observations"><div className="observations-heading"><span>REVIEW SIGNALS</span><span>IN DEVELOPMENT</span></div><div className="observation-row"><span className="observation-index">01</span><span>File details</span><span className="observation-state">PLANNED</span></div><div className="observation-row"><span className="observation-index observation-blue">02</span><span>Reputation</span><span className="observation-state">PLANNED</span></div><div className="observation-row"><span className="observation-index observation-coral">03</span><span>Behavior</span><span className="observation-state">PLANNED</span></div></div>
                                </div>
                            </div>
                        </div>
                        <p className="stage-disclaimer"><span className="stage-dot" /> Concept only. No file is being analyzed.</p>
                    </div>
                </section>
                <section className="signal-band" aria-label="Project principles">
                    <div className="page-width signal-band-inner"><span><i className="signal-dot green" /> EVIDENCE, NOT GUESSWORK</span><span><i className="signal-dot blue" /> CONTEXT, NOT A SINGLE SCORE</span><span><i className="signal-dot coral" /> HONEST ABOUT UNCERTAINTY</span></div>
                </section>
                <section className="feature-band">
                    <div className="page-width feature-grid">
                        <div className="feature-heading"><p className="eyebrow">A BETTER KIND OF FILE REVIEW</p><h2>Security signals deserve context.</h2></div>
                        <p className="feature-intro">A file name alone is not enough. Softcore aims to show the evidence, its context, and what remains uncertain.</p>
                        <article className="feature-item"><span className="feature-number">01 <i>IDENTITY</i></span><h3>Know the file</h3><p>Inspect file type, publisher, and hash.</p></article>
                        <article className="feature-item"><span className="feature-number feature-blue">02 <i>CONTEXT</i></span><h3>Compare signals</h3><p>See reputation alongside file details.</p></article>
                        <article className="feature-item"><span className="feature-number feature-amber">03 <i>CLARITY</i></span><h3>Understand limits</h3><p>See what is known and what is not.</p></article>
                    </div>
                </section>
                <section className="release-strip page-width"><div><p className="eyebrow">PROJECT STATUS</p><h2>In development. No public build yet.</h2><p>Verified installers will appear on the releases page.</p></div><Link className="button button-outline" href="/download">View releases <span aria-hidden="true">&#8594;</span></Link></section>
            </main>
        </SiteShell>
    );
}
