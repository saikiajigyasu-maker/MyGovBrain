import './styles.css';

export const metadata = {
    title: 'Softcore',
    description: 'Independent security software in development.'
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="softcore">{children}</body>
        </html>
    );
}
