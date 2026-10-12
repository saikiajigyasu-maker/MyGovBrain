import Link from 'next/link';

const navigation = [
    { href: '/', label: 'Home', id: 'home' },
    { href: '/approach', label: 'Our approach', id: 'approach' },
    { href: '/download', label: 'Download', id: 'download' },
    { href: '/account', label: 'Access', id: 'account', className: 'nav-account' }
];

export function SiteShell({ activePage, children, homePage = false }) {
    return (
        <div className={homePage ? 'home-page' : undefined}>
            <a className="skip-link" href="#main-content">Skip to content</a>
            <header className="navbar_container">
                <Link className="brand" href="/" aria-label="Softcore home">
                    <span className="brand-mark">S</span>
                    <span className="heading">softcore</span>
                </Link>
                <nav className="nav" id="site-navigation" aria-label="Main navigation">
                    {navigation.map(({ href, label, id, className = '' }) => (
                        <Link
                            key={id}
                            href={href}
                            className={`nav-link ${className} ${activePage === id ? 'active' : ''}`.trim()}
                            aria-current={activePage === id ? 'page' : undefined}
                        >
                            {label}
                        </Link>
                    ))}
                </nav>
            </header>
            {children}
            <footer className="site-footer page-width">
                <Link className="footer-brand" href="/">softcore<span className="footer-period">.</span></Link>
                <span>Independent security software in development.</span>
                <Link href="/approach">Our approach</Link>
                <Link href="/download">Release status</Link>
            </footer>
        </div>
    );
}
