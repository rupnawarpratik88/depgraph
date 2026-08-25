'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const GraphView = dynamic(() => import('@/components/GraphView'), { ssr: false })

function SeverityBadge({ severity }) {
  if (!severity) return null
  return <span className={`badge badge-${severity.toLowerCase()}`}>{severity}</span>
}

function formatDownloads(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M / week`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K / week`
  return `${n} / week`
}

export default function PackagePage({ params }) {
  const [packageName, setPackageName] = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    Promise.resolve(params).then(p => {
      const name = decodeURIComponent(p.name)
      setPackageName(name)
      fetch(`/api/package/${encodeURIComponent(name)}`)
        .then(res => res.json().then(json => ({ ok: res.ok, json })))
        .then(({ ok, json }) => {
          if (!ok) setError(json.error || 'Failed to load package.')
          else setData(json)
        })
        .catch(() => setError('Could not reach the server. Please try again shortly.'))
        .finally(() => setLoading(false))
    })
  }, [params])

  return (
    <div style={{ padding: 'var(--space-8) 0 var(--space-12)' }}>
      <div className="container">

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 'var(--space-6)' }}>
          ← Back to search
        </Link>

        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading package graph…</span>
          </div>
        )}

        {error && !loading && (
          <div className="error-state" role="alert">
            <svg className="error-state-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <div className="error-state-title">Could not load package</div>
              <div className="error-state-body">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && data && (() => {
          const { package: pkg, graph } = data
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
                  <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {pkg.name}
                  </h1>
                  <span className="pkg-version" style={{ fontSize: '1rem' }}>v{pkg.version}</span>
                  {pkg.directVulns.length > 0 && (
                    <span className="badge badge-critical">
                      {pkg.directVulns.length} direct vuln{pkg.directVulns.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: 600 }}>
                  {pkg.description}
                </p>
              </div>

              <div className="stat-row">
                <div className="stat">
                  <span className="stat-value">{formatDownloads(pkg.weeklyDownloads)}</span>
                  <span className="stat-label">Weekly downloads</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{pkg.directDeps.length}</span>
                  <span className="stat-label">Direct deps</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{pkg.dependents.length}</span>
                  <span className="stat-label">Used by</span>
                </div>
                <div className="stat">
                  <span className="stat-value" style={{ color: pkg.transitiveVulns.length > 0 ? 'var(--critical)' : 'var(--low)' }}>
                    {pkg.transitiveVulns.length}
                  </span>
                  <span className="stat-label">Transitive vulns</span>
                </div>
                {pkg.license && (
                  <div className="stat">
                    <span className="stat-value" style={{ fontSize: '1rem' }}>{pkg.license}</span>
                    <span className="stat-label">License</span>
                  </div>
                )}
              </div>

              <div className="divider" />

              <div>
                <p className="section-label">Dependency graph (2 hops)</p>
                {graph.nodes.length > 1 ? (
                  <GraphView nodes={graph.nodes} edges={graph.edges} />
                ) : (
                  <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
                    <div className="empty-state-icon">🔗</div>
                    <div className="empty-state-title">No dependencies</div>
                    <div className="empty-state-body">This package has no recorded dependencies.</div>
                  </div>
                )}
              </div>

              {pkg.directVulns.length > 0 && (
                <div>
                  <p className="section-label">Direct vulnerabilities</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {pkg.directVulns.map(v => (
                      <Link key={v.id} href={`/vulnerability/${v.id}`} className="card card-link">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                          <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-code)', marginBottom: 'var(--space-1)' }}>{v.id}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{v.title}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CVSS {v.cvss}</span>
                            <SeverityBadge severity={v.severity} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="section-label">
                  Transitive vulnerability exposure
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-muted)', marginLeft: 'var(--space-2)' }}>
                    — CVEs reachable 2–4 hops through dependencies
                  </span>
                </p>
                {pkg.transitiveVulns.length === 0 ? (
                  <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
                    <div className="empty-state-icon">✅</div>
                    <div className="empty-state-title">No transitive exposure</div>
                    <div className="empty-state-body">No CVEs were found within 4 hops of this package's dependency tree.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {pkg.transitiveVulns.map((v, i) => (
                      <div key={i} className="card">
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                              <Link href={`/vulnerability/${v.cveId}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-code)', textDecoration: 'none' }}>
                                {v.cveId}
                              </Link>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                via <Link href={`/package/${v.packageName}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{v.packageName}</Link>
                                {' '}({v.hops} hop{v.hops !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{v.title}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CVSS {v.cvss}</span>
                            <SeverityBadge severity={v.severity} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pkg.directDeps.length > 0 && (
                <div>
                  <p className="section-label">Direct dependencies ({pkg.directDeps.length})</p>
                  <div className="chip-list">
                    {pkg.directDeps.map(d => (
                      <Link key={d.name} href={`/package/${d.name}`} className="chip">{d.name}</Link>
                    ))}
                  </div>
                </div>
              )}

              {pkg.dependents.length > 0 && (
                <div>
                  <p className="section-label">Used by ({pkg.dependents.length})</p>
                  <div className="chip-list">
                    {pkg.dependents.map(d => (
                      <Link key={d.name} href={`/package/${d.name}`} className="chip">{d.name}</Link>
                    ))}
                  </div>
                </div>
              )}

              {pkg.maintainers.length > 0 && (
                <div>
                  <p className="section-label">Maintainers</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    {pkg.maintainers.map(m => (
                      <a key={m.name} href={m.github ? `https://github.com/${m.github}` : undefined} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                        <span>👤</span>{m.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )
        })()}
      </div>
    </div>
  )
}