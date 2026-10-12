import Link from 'next/link';
import { SiteShell } from '../../components/SiteShell';

export const metadata = {
    title: 'Our approach | Softcore',
    description: 'Learn how Softcore plans to present file identity, reputation, behavior, and uncertainty together.'
};

export default function ApproachPage() {
    return (
        <SiteShell activePage="approach">
            <main className="page-width inner-page" id="main-content">
                <section className="page-heading approach-heading">
                    <p className="eyebrow"><span className="status-dot" /> THE SOFTCORE APPROACH</p>
                    <h1>More context. Fewer false certainties.</h1>
                    <p>Softcore is being designed to help people examine unfamiliar applications with useful evidence in view, without pretending that a single score can settle the question.</p>
                </section>
                <section className="approach-intro">
                    <div className="approach-lead"><p className="eyebrow">WHY THIS MATTERS</p><h2>A warning needs to explain itself.</h2><p>File analysis can involve several kinds of evidence. A useful tool should show where each signal comes from, what it says, and what it cannot tell you.</p></div>
                    <div className="approach-quote"><span className="quote-mark">“</span><p>Analysis can inform a decision. It cannot make that decision for you.</p><span className="quote-attribution">A PRINCIPLE, NOT A VERDICT</span></div>
                </section>
                <section className="evidence-section" aria-labelledby="evidence-title">
                    <div className="section-title"><div><p className="eyebrow">THREE LENSES</p><h2 id="evidence-title">A file, seen from more than one angle.</h2></div><span className="section-index">01 / 03</span></div>
                    <div className="evidence-grid">
                        <article className="evidence-item"><span className="evidence-number">01</span><span className="evidence-tag">IDENTITY</span><h3>What is this file?</h3><p>Properties like file type, publisher signature, and cryptographic hash help identify exactly what is under review.</p><span className="evidence-status"><i className="signal-dot green" /> PLANNED</span></article>
                        <article className="evidence-item"><span className="evidence-number evidence-number-blue">02</span><span className="evidence-tag">REPUTATION</span><h3>What is known about it?</h3><p>Reputation signals may add useful context, but they can be incomplete, delayed, or wrong.</p><span className="evidence-status"><i className="signal-dot blue" /> PLANNED</span></article>
                        <article className="evidence-item"><span className="evidence-number evidence-number-coral">03</span><span className="evidence-tag">BEHAVIOR</span><h3>What does it try to do?</h3><p>Behavior observations can help explain activity. They should be presented with clear scope and limitations.</p><span className="evidence-status"><i className="signal-dot coral" /> EXPLORING</span></article>
                    </div>
                </section>
                <section className="principles principles-expanded"><div className="principles-heading"><p className="eyebrow">DESIGN PRINCIPLES</p><h2>Clarity is part of security.</h2></div><div className="principle-list"><article className="principle-row"><span>01</span><div><h3>Show the source</h3><p>Make it possible to understand why a signal appears and where it came from.</p></div></article><article className="principle-row"><span>02</span><div><h3>Keep uncertainty visible</h3><p>Absence of evidence is not proof that a file is safe. Detection is never perfect.</p></div></article><article className="principle-row"><span>03</span><div><h3>Respect the file owner</h3><p>Privacy, consent, and transparent handling should be considered before any upload-based workflow.</p></div></article><article className="principle-row"><span>04</span><div><h3>Publish changes plainly</h3><p>Every public build should come with a version, supported systems, and useful release notes.</p></div></article></div></section>
                <section className="notice-band"><span className="notice-mark">i</span><p><strong>Where the project stands:</strong> these are design goals, not available product features. This website does not scan, upload, or analyze files. No desktop app is available yet.</p><Link href="/download" className="text-link">See release status <span aria-hidden="true">&#8594;</span></Link></section>
            </main>
        </SiteShell>
    );
}
