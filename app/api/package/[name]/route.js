import { runQuery, verifyConnectivity } from '@/lib/neo4j'
import { NextResponse } from 'next/server'

/**
 * GET /api/package/[name]
 *
 * Returns full package detail including:
 * - Package metadata
 * - Direct dependencies (1 hop)
 * - Direct dependents (reverse 1 hop)
 * - Direct vulnerabilities
 * - MULTI-HOP: Transitive vulnerability exposure (up to 4 hops deep)
 *   This is the query a relational DB would find deeply awkward —
 *   recursive traversal of unknown depth to find indirect CVE exposure.
 * - Maintainers
 * - Graph nodes + edges for visualisation
 */
export async function GET(request, { params }) {
  const packageName = params.name

  try {
    await verifyConnectivity()
  } catch {
    return NextResponse.json(
      { error: 'Database is currently unreachable. Please try again shortly.' },
      { status: 503 }
    )
  }

  try {
    // 1. Package metadata + direct deps + direct vulns
    const metaRecords = await runQuery(
      `MATCH (p:Package { name: $name })
       OPTIONAL MATCH (p)-[:DEPENDS_ON]->(dep:Package)
       OPTIONAL MATCH (p)-[:HAS_VULNERABILITY]->(cve:CVE)
       OPTIONAL MATCH (m:Maintainer)-[:MAINTAINS]->(p)
       RETURN p.name            AS name,
              p.version         AS version,
              p.description     AS description,
              p.license         AS license,
              p.weeklyDownloads AS weeklyDownloads,
              collect(DISTINCT {
                name:    dep.name,
                version: dep.version
              }) AS directDeps,
              collect(DISTINCT {
                id:       cve.id,
                severity: cve.severity,
                cvss:     cve.cvss,
                title:    cve.title
              }) AS directVulns,
              collect(DISTINCT {
                name:   m.name,
                github: m.github
              }) AS maintainers`,
      { name: packageName }
    )

    if (!metaRecords.length || !metaRecords[0].name) {
      return NextResponse.json(
        { error: `Package "${packageName}" not found.` },
        { status: 404 }
      )
    }

    const meta = metaRecords[0]

    // 2. Packages that depend ON this package (reverse traversal)
    const dependentsRecords = await runQuery(
      `MATCH (dependent:Package)-[:DEPENDS_ON]->(p:Package { name: $name })
       RETURN dependent.name    AS name,
              dependent.version AS version
       LIMIT 20`,
      { name: packageName }
    )

    // 3. MULTI-HOP TRAVERSAL (2–4 hops):
    //    Find ALL packages reachable from this package transitively,
    //    and which of those have known vulnerabilities.
    //    A relational DB cannot do this cleanly — it would require
    //    recursive CTEs of unknown depth or application-level BFS.
    //    In Cypher, variable-length path syntax handles this elegantly.
    const transitiveVulnRecords = await runQuery(
      `MATCH path = (p:Package { name: $name })-[:DEPENDS_ON*2..4]->(transitive:Package)-[:HAS_VULNERABILITY]->(cve:CVE)
       RETURN DISTINCT
              transitive.name AS packageName,
              cve.id          AS cveId,
              cve.severity    AS severity,
              cve.cvss        AS cvss,
              cve.title       AS title,
              length(path) - 1 AS hops
       ORDER BY cve.cvss DESC, hops ASC`,
      { name: packageName }
    )

    // 4. Full dependency subgraph for graph visualisation (up to 2 hops)
    //    Returns nodes and relationships so the frontend can render the graph
    const graphRecords = await runQuery(
      `MATCH path = (p:Package { name: $name })-[:DEPENDS_ON*1..2]->(dep:Package)
       UNWIND relationships(path) AS rel
       WITH startNode(rel) AS src, endNode(rel) AS tgt
       RETURN DISTINCT
              src.name AS source,
              tgt.name AS target`,
      { name: packageName }
    )

    // Build graph structure for Cytoscape
    const nodeSet = new Set([packageName])
    const edges = []
    for (const r of graphRecords) {
      nodeSet.add(r.source)
      nodeSet.add(r.target)
      edges.push({ source: r.source, target: r.target })
    }

    // Mark which nodes are vulnerable
    const allVulnPackages = new Set([
      ...meta.directVulns.filter(v => v.id).map(() => packageName),
      ...transitiveVulnRecords.map(r => r.packageName),
    ])

    const nodes = Array.from(nodeSet).map(n => ({
      id: n,
      isRoot: n === packageName,
      isVulnerable: allVulnPackages.has(n),
    }))

    return NextResponse.json({
      package: {
        name:            meta.name,
        version:         meta.version,
        description:     meta.description,
        license:         meta.license,
        weeklyDownloads: meta.weeklyDownloads?.toNumber?.() ?? meta.weeklyDownloads,
        directDeps:      meta.directDeps.filter(d => d.name),
        directVulns:     meta.directVulns.filter(v => v.id),
        maintainers:     meta.maintainers.filter(m => m.name),
        dependents:      dependentsRecords.map(r => ({ name: r.name, version: r.version })),
        transitiveVulns: transitiveVulnRecords.map(r => ({
          packageName: r.packageName,
          cveId:       r.cveId,
          severity:    r.severity,
          cvss:        r.cvss?.toNumber?.() ?? r.cvss,
          title:       r.title,
          hops:        r.hops?.toNumber?.() ?? r.hops,
        })),
      },
      graph: { nodes, edges },
    })
  } catch (err) {
    console.error(`[/api/package/${packageName}] Error:`, err.message)
    return NextResponse.json(
      { error: 'Failed to load package data. Please try again.' },
      { status: 500 }
    )
  }
}
