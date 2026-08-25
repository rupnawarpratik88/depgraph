# DepGraph — NPM Dependency & Vulnerability Explorer

> Explore transitive CVE exposure across NPM package dependency chains, powered by a graph database.

**[Live Demo →](https://depgraph-three.vercel.app)** &nbsp;|&nbsp; **[Screen Recording →](#)**

![DepGraph Screenshot](docs/screenshot-home.png)

---

## Use Case

Modern JavaScript projects pull in hundreds of transitive dependencies. When a CVE is disclosed in a low-level utility package like `qs` or `minimist`, it may silently affect dozens of higher-level packages — `express`, `webpack`, `eslint` — that depend on it indirectly. Developers need to answer questions like:

- *Is my project transitively exposed to CVE-2022-24999 through express?*
- *Which packages in the ecosystem are 3 hops away from this vulnerability?*
- *What is the blast radius of a newly disclosed CVE?*

These questions are fundamentally about **following chains of relationships to unknown depth** — exactly what a graph database is built for.

---

## Why a Graph Database?

A relational database stores dependency data in a table like:

```
package_dependencies(dependent_name, dependency_name, version_range)
```

To find packages **transitively** exposed to a CVE, you'd need a recursive Common Table Expression (CTE) of unknown depth, re-joining the same table repeatedly. The query becomes complex, slow, and fragile as depth increases. Most ORMs don't support it at all.

In Cypher (openCypher on CognoDB), the same traversal is a single elegant pattern:

```cypher
MATCH path = (p:Package { name: $name })-[:DEPENDS_ON*2..4]->(t:Package)-[:HAS_VULNERABILITY]->(c:CVE)
RETURN t.name, c.id, length(path) AS hops
```

The `*2..4` syntax means "follow DEPENDS_ON edges between 2 and 4 times" — the graph engine handles the recursion natively, with indexes and traversal optimisation built in. Adding a fifth hop is one character change. In SQL, it would require restructuring the entire query.

**Key advantages of the graph model here:**
- **Variable-depth traversal** is a first-class operation, not a workaround
- **Relationship properties** (e.g. `versionRange` on `DEPENDS_ON`) live on the edge, not in a join table
- **Multi-entity queries** (Package → Package → CVE → Maintainer) are single connected patterns, not multi-table joins
- **Blast radius queries** (who upstream depends on this vulnerable package?) are trivially reversed with `<-[:DEPENDS_ON*1..3]-`

---

## Data Model

```
┌─────────────┐     DEPENDS_ON      ┌─────────────┐
│   Package   │ ─────────────────▶  │   Package   │
│             │  {versionRange}      │             │
│ name        │                      │ name        │
│ version     │                      │ version     │
│ description │                      │ description │
│ license     │     HAS_VULNERABILITY│ license     │
│ weeklyDL    │ ──────────────────▶  └─────────────┘
└─────────────┘                            │
       ▲                                   ▼
       │                          ┌─────────────┐
  MAINTAINS                       │     CVE     │
       │                          │             │
┌─────────────┐                   │ id          │
│ Maintainer  │                   │ severity    │
│             │                   │ cvss        │
│ id          │                   │ title       │
│ name        │                   │ description │
│ email       │                   │ publishedAt │
│ github      │                   │ patchedIn   │
└─────────────┘                   └─────────────┘
```

### Node Labels
| Label | Properties |
|---|---|
| `Package` | `name` (unique), `version`, `description`, `license`, `weeklyDownloads` |
| `CVE` | `id` (unique), `severity`, `cvss`, `title`, `description`, `publishedAt`, `patchedIn` |
| `Maintainer` | `id` (unique), `name`, `email`, `github` |

### Relationship Types
| Type | From → To | Properties |
|---|---|---|
| `DEPENDS_ON` | Package → Package | `versionRange` |
| `HAS_VULNERABILITY` | Package → CVE | — |
| `MAINTAINS` | Maintainer → Package | — |

---

## Cypher Queries

### 1. Search packages by name or description
```cypher
MATCH (p:Package)
WHERE toLower(p.name) CONTAINS toLower($query)
   OR toLower(p.description) CONTAINS toLower($query)
OPTIONAL MATCH (p)-[:HAS_VULNERABILITY]->(c:CVE)
OPTIONAL MATCH (p)-[:DEPENDS_ON]->(dep:Package)
RETURN p.name, p.version, p.description,
       count(DISTINCT c) AS vulnCount,
       count(DISTINCT dep) AS depCount
ORDER BY p.weeklyDownloads DESC
LIMIT 10
```

### 2. Multi-hop: Transitive vulnerability exposure (2–4 hops)
*The query a relational DB finds awkward — variable-depth recursive traversal.*
```cypher
MATCH path = (p:Package { name: $name })-[:DEPENDS_ON*2..4]->(t:Package)-[:HAS_VULNERABILITY]->(cve:CVE)
RETURN DISTINCT
       t.name           AS packageName,
       cve.id           AS cveId,
       cve.severity     AS severity,
       cve.cvss         AS cvss,
       cve.title        AS title,
       length(path) - 1 AS hops
ORDER BY cve.cvss DESC, hops ASC
```

### 3. Multi-hop: CVE blast radius (upstream exposure)
*Reverse traversal — who depends on the vulnerable package?*
```cypher
MATCH (p:Package)-[:HAS_VULNERABILITY]->(c:CVE { id: $cveId })
MATCH path = (upstream:Package)-[:DEPENDS_ON*1..3]->(p)
RETURN DISTINCT
       upstream.name    AS name,
       upstream.version AS version,
       p.name           AS throughPackage,
       length(path)     AS hops
ORDER BY hops ASC, upstream.name ASC
```

### 4. Full dependency subgraph for visualisation
```cypher
MATCH path = (p:Package { name: $name })-[:DEPENDS_ON*1..2]->(dep:Package)
UNWIND relationships(path) AS rel
WITH startNode(rel) AS src, endNode(rel) AS tgt
RETURN DISTINCT src.name AS source, tgt.name AS target
```

### 5. Package metadata + direct dependencies + maintainers
```cypher
MATCH (p:Package { name: $name })
OPTIONAL MATCH (p)-[:DEPENDS_ON]->(dep:Package)
OPTIONAL MATCH (p)-[:HAS_VULNERABILITY]->(cve:CVE)
OPTIONAL MATCH (m:Maintainer)-[:MAINTAINS]->(p)
RETURN p.name, p.version, p.description, p.license, p.weeklyDownloads,
       collect(DISTINCT { name: dep.name, version: dep.version }) AS directDeps,
       collect(DISTINCT { id: cve.id, severity: cve.severity, cvss: cve.cvss, title: cve.title }) AS directVulns,
       collect(DISTINCT { name: m.name, github: m.github }) AS maintainers
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- A free CognoDB account (no credit card required)

### 1. Create a CognoDB instance
1. Go to [console.cognodb.com/signup](https://console.cognodb.com/signup) and create an account
2. From the console, create a free **c0** instance and pick a region
3. Copy the connection URI (`bolt+s://<instance-id>.databases.cognodb.cloud`) and generated password — **the password is shown only once**

### 2. Clone and install
```bash
git clone https://github.com/<your-username>/depgraph
cd depgraph
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```
NEO4J_URI=bolt+s://<your-instance-id>.databases.cognodb.cloud
NEO4J_USERNAME=cognodb
NEO4J_PASSWORD=<your-password>
```

### 4. Seed the database
```bash
npm run seed
```
This loads 31 packages, 8 CVEs, 8 maintainers, 36 dependency edges, and 8 vulnerability relationships.

### 5. Run the application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel (for hosted demo)
```bash
npm install -g vercel
vercel
```
Add `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` as environment variables in the Vercel dashboard.

---

## Screenshots

### Home — package search
![Home page](docs/screenshot-home.png)

### Package detail — dependency graph + transitive CVE exposure
![Package detail](docs/screenshot-package.png)

### CVE detail — blast radius across the ecosystem
![CVE detail](docs/screenshot-cve.png)

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database driver | `neo4j-driver` v5 (official, Bolt 5.0 compatible) |
| Database | CognoDB Cloud (openCypher, Bolt protocol) |
| Graph visualisation | Cytoscape.js |
| Hosting | Vercel |

---

## Project Structure
```
depgraph/
├── lib/neo4j.js                    # DB driver singleton + query helpers
├── scripts/seed.js                 # Data loading script
├── app/
│   ├── layout.jsx                  # Root layout + navigation
│   ├── page.jsx                    # Home — live package search
│   ├── globals.css                 # Design system tokens + styles
│   ├── api/
│   │   ├── search/route.js         # GET /api/search?q=
│   │   ├── package/[name]/route.js # GET /api/package/:name
│   │   └── vulnerability/[cveId]/route.js
│   ├── package/[name]/page.jsx     # Package detail UI
│   └── vulnerability/[cveId]/page.jsx
└── components/
    └── GraphView.jsx               # Cytoscape dependency graph
```

---

## Engineering Notes

- **No string-concatenated Cypher.** Every query uses `$paramName` placeholders via the official Neo4j driver.
- **Credentials are read exclusively from environment variables** and are never committed to the repository (see `.gitignore`).
- **DB connection is a singleton** — the driver is reused across API route invocations to avoid pool exhaustion during Next.js hot reload.
- **Graceful error handling** — every API route calls `verifyConnectivity()` before querying and returns a `503` with a human-readable message if the database is unreachable. The UI surfaces loading, empty, and error states for every async operation.
- **GraphView loads dynamically** (`next/dynamic` with `ssr: false`) because Cytoscape.js requires browser APIs unavailable during server-side rendering.
