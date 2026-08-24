'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function SeverityBadge({ severity }) {
  if (!severity) return null
  return (
    <span className={`badge badge-${severity.toLowerCase()}`}>
      {severity}
    </span>
  )
}

function formatDownloads(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M/wk`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K/wk`
  return `${n}/wk`
}

export default function HomePage() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setHasSearched(false)
      setError(null)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      setHasSearched(true)

      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Search failed. Please try again.')
          setResults([])
        } else {
          setResults(data.packages)
        }
      } catch {
        setError('Could not reach the server. Please try again shortly.')
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [query])

  const suggestions = ['express', 'lodash', 'webpack', 'axios', 'eslint', 'react']

  return (
    <div style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}>
      <div className="container">

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 'var(--space-3)',
          }}>
            Graph-powered · Powered by CognoDB
          </p>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 'var(--space-4)',
          }}>
            Trace vulnerability blast radius<br />
            <span style={{ color: 'var(--accent)' }}>across dependency chains</span>
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.05rem',
            maxWidth: 520,
            margin: '0 auto',
          }}>
            Search any NPM package to see which CVEs propagate through its transitive
            dependencies — the kind of traversal a relational database cannot do elegantly.
          </p>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 640, margin: '0 auto var(--space-4)' }}>
          <div className="search-wrap">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search packages — try express, webpack, axios…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              aria-label="Search NPM packages"
            />
          </div>

          {/* Suggestions */}
          {!hasSearched && (
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try:</span>
              {suggestions.map(s => (
                <button
                  key={s}
                  className="chip"
                  onClick={() => setQuery(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <span>Searching the graph…</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="error-state" role="alert">
              <svg className="error-state-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <div className="error-state-title">Something went wrong</div>
                <div className="error-state-body">{error}</div>
              </div>
            </div>
          )}

          {/* Empty state after search */}
          {!loading && !error && hasSearched && results.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No packages found for "{query}"</div>
              <div className="empty-state-body">
                Try a different name — the database includes packages like express, lodash, webpack, axios, and their dependency trees.
              </div>
            </div>
          )}

          {/* Results list */}
          {!loading && !error && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {results.map(pkg => (
                <Link
                  key={pkg.name}
                  href={`/package/${encodeURIComponent(pkg.name)}`}
                  className="card card-link"
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <span className="pkg-name">{pkg.name}</span>
                        <span className="pkg-version">v{pkg.version}</span>
                      </div>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                        {pkg.description}
                      </p>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        <span>{formatDownloads(pkg.weeklyDownloads)}</span>
                        <span>{pkg.depCount} dep{pkg.depCount !== 1 ? 's' : ''}</span>
                        {pkg.license && <span>{pkg.license}</span>}
                      </div>
                    </div>
                    {pkg.vulnCount > 0 && (
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <span className="badge badge-critical">
                          {pkg.vulnCount} vuln{pkg.vulnCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bottom stats */}
        {!hasSearched && (
          <div style={{ marginTop: 'var(--space-12)', textAlign: 'center' }}>
            <div className="stat-row" style={{ justifyContent: 'center', gap: 'var(--space-8)' }}>
              {[
                { value: '31', label: 'Packages' },
                { value: '8', label: 'CVEs tracked' },
                { value: '36', label: 'Dep edges' },
                { value: '4 hops', label: 'Max traversal' },
              ].map(s => (
                <div key={s.label} className="stat" style={{ alignItems: 'center' }}>
                  <span className="stat-value">{s.value}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
