import { runQuery, verifyConnectivity } from '@/lib/neo4j'
import { NextResponse } from 'next/server'

/**
 * GET /api/search?q=express
 * Full-text search across Package nodes by name and description.
 * Returns top 10 matches with vulnerability count.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 1) {
    return NextResponse.json({ packages: [] })
  }

  // Graceful connectivity check
  try {
    await verifyConnectivity()
  } catch {
    return NextResponse.json(
      { error: 'Database is currently unreachable. Please try again shortly.' },
      { status: 503 }
    )
  }

  try {
    // Parameterised query — $query is never interpolated into the Cypher string
    const records = await runQuery(
      `MATCH (p:Package)
       WHERE toLower(p.name) CONTAINS toLower($query)
          OR toLower(p.description) CONTAINS toLower($query)
       OPTIONAL MATCH (p)-[:HAS_VULNERABILITY]->(c:CVE)
       OPTIONAL MATCH (p)-[:DEPENDS_ON]->(dep:Package)
       RETURN p.name            AS name,
              p.version         AS version,
              p.description     AS description,
              p.license         AS license,
              p.weeklyDownloads AS weeklyDownloads,
              count(DISTINCT c) AS vulnCount,
              count(DISTINCT dep) AS depCount
       ORDER BY p.weeklyDownloads DESC
       LIMIT 10`,
      { query: q }
    )

    const packages = records.map(r => ({
      name:            r.name,
      version:         r.version,
      description:     r.description,
      license:         r.license,
      weeklyDownloads: r.weeklyDownloads?.toNumber?.() ?? r.weeklyDownloads,
      vulnCount:       r.vulnCount?.toNumber?.() ?? r.vulnCount,
      depCount:        r.depCount?.toNumber?.() ?? r.depCount,
    }))

    return NextResponse.json({ packages })
  } catch (err) {
    console.error('[/api/search] Query error:', err.message)
    return NextResponse.json(
      { error: 'Failed to search packages. Please try again.' },
      { status: 500 }
    )
  }
}
