import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'DepGraph — NPM Dependency & Vulnerability Explorer',
  description: 'Explore NPM package dependency chains and CVE vulnerability blast radius using graph database traversal.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="container nav-inner">
            <Link href="/" className="nav-logo">
              <span className="nav-logo-icon">⬡</span>
              DepGraph
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link">Explore</Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                GitHub
              </a>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  )
}
