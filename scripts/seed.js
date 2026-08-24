/**
 * seed.js — Loads realistic NPM package dependency + CVE vulnerability data
 * into CognoDB using the official Neo4j driver with parameterised queries.
 *
 * Run with: npm run seed
 * Requires: .env.local with NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD
 */

require('dotenv').config({ path: '.env.local' })
const neo4j = require('neo4j-driver')

const URI      = process.env.NEO4J_URI
const USERNAME = process.env.NEO4J_USERNAME
const PASSWORD = process.env.NEO4J_PASSWORD

if (!URI || !USERNAME || !PASSWORD) {
  console.error('❌  Missing env vars. Copy .env.example → .env.local and fill in credentials.')
  process.exit(1)
}

const driver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD))

// ---------------------------------------------------------------------------
// Seed data: realistic NPM ecosystem snapshot
// ---------------------------------------------------------------------------

const maintainers = [
  { id: 'm1', name: 'Sindre Sorhus',    email: 'sindresorhus@gmail.com',   github: 'sindresorhus' },
  { id: 'm2', name: 'TJ Holowaychuk',   email: 'tj@vision-media.ca',       github: 'tj' },
  { id: 'm3', name: 'Mikeal Rogers',    email: 'mikeal@mikealrogers.com',  github: 'mikeal' },
  { id: 'm4', name: 'Isaac Schlueter',  email: 'i@izs.me',                 github: 'isaacs' },
  { id: 'm5', name: 'Feross Aboukhadijeh', email: 'feross@feross.org',     github: 'feross' },
  { id: 'm6', name: 'Evan You',         email: 'yyx990803@gmail.com',      github: 'yyx990803' },
  { id: 'm7', name: 'Sebastian McKenzie', email: 'sebmck@gmail.com',       github: 'babel' },
  { id: 'm8', name: 'James Kyle',       email: 'thejameskyle@gmail.com',   github: 'jamiebuilds' },
]

const packages = [
  // Core ecosystem packages
  { name: 'express',          version: '4.18.2', description: 'Fast, unopinionated web framework for Node.js',         license: 'MIT',     weeklyDownloads: 32000000 },
  { name: 'lodash',           version: '4.17.21', description: 'A modern JavaScript utility library',                  license: 'MIT',     weeklyDownloads: 48000000 },
  { name: 'chalk',            version: '5.3.0',  description: 'Terminal string styling done right',                    license: 'MIT',     weeklyDownloads: 190000000 },
  { name: 'axios',            version: '1.6.8',  description: 'Promise based HTTP client for browser and Node.js',     license: 'MIT',     weeklyDownloads: 55000000 },
  { name: 'moment',           version: '2.29.4', description: 'Parse, validate, manipulate and display dates',         license: 'MIT',     weeklyDownloads: 14000000 },
  { name: 'react',            version: '18.3.1', description: 'A JavaScript library for building user interfaces',     license: 'MIT',     weeklyDownloads: 22000000 },
  { name: 'webpack',          version: '5.91.0', description: 'A bundler for JavaScript and friends',                  license: 'MIT',     weeklyDownloads: 25000000 },
  { name: 'babel-core',       version: '7.24.4', description: 'Babel compiler core',                                   license: 'MIT',     weeklyDownloads: 18000000 },
  { name: 'typescript',       version: '5.4.5',  description: 'TypeScript is a typed superset of JavaScript',          license: 'Apache-2.0', weeklyDownloads: 50000000 },
  { name: 'eslint',           version: '8.57.0', description: 'An AST-based pattern checker for JavaScript',           license: 'MIT',     weeklyDownloads: 30000000 },

  // Dependencies of express
  { name: 'body-parser',      version: '1.20.2', description: 'Node.js body parsing middleware',                       license: 'MIT',     weeklyDownloads: 21000000 },
  { name: 'debug',            version: '4.3.4',  description: 'A tiny JavaScript debugging utility',                   license: 'MIT',     weeklyDownloads: 400000000 },
  { name: 'path-to-regexp',   version: '0.1.7',  description: 'Express style path to regexp',                          license: 'MIT',     weeklyDownloads: 60000000 },
  { name: 'qs',               version: '6.11.0', description: 'A querystring parser with nesting support',             license: 'BSD-3-Clause', weeklyDownloads: 80000000 },
  { name: 'accepts',          version: '1.3.8',  description: 'Higher-level content negotiation',                      license: 'MIT',     weeklyDownloads: 30000000 },
  { name: 'serve-static',     version: '1.15.0', description: 'Serve static files',                                    license: 'MIT',     weeklyDownloads: 20000000 },

  // Dependencies of body-parser
  { name: 'raw-body',         version: '2.5.2',  description: 'Get and validate the raw body of a readable stream',    license: 'MIT',     weeklyDownloads: 25000000 },
  { name: 'iconv-lite',       version: '0.4.24', description: 'Convert character encodings in pure javascript',        license: 'MIT',     weeklyDownloads: 60000000 },
  { name: 'depd',             version: '2.0.0',  description: 'Deprecate all the things',                              license: 'MIT',     weeklyDownloads: 35000000 },

  // Dependencies of webpack
  { name: 'acorn',            version: '8.11.3', description: 'A tiny, fast JavaScript parser',                        license: 'MIT',     weeklyDownloads: 90000000 },
  { name: 'enhanced-resolve', version: '5.16.1', description: 'Offers an async require.resolve function with more features', license: 'MIT', weeklyDownloads: 25000000 },
  { name: 'tapable',          version: '2.2.1',  description: 'Just a little module for plugins',                      license: 'MIT',     weeklyDownloads: 28000000 },
  { name: 'terser-webpack-plugin', version: '5.3.10', description: 'Terser plugin for webpack',                        license: 'MIT',     weeklyDownloads: 22000000 },

  // Dependencies shared across packages
  { name: 'ms',               version: '2.1.3',  description: 'Tiny millisecond conversion utility',                   license: 'MIT',     weeklyDownloads: 430000000 },
  { name: 'mime-types',       version: '2.1.35', description: 'The ultimate javascript content-type utility',          license: 'MIT',     weeklyDownloads: 90000000 },
  { name: 'mime-db',          version: '1.52.0', description: 'Media Type Database',                                   license: 'MIT',     weeklyDownloads: 90000000 },

  // Known vulnerable packages (historical)
  { name: 'minimist',         version: '1.2.5',  description: 'Parse argument options',                                license: 'MIT',     weeklyDownloads: 70000000 },
  { name: 'node-fetch',       version: '2.6.7',  description: 'A light-weight module that brings Fetch API to Node.js', license: 'MIT',    weeklyDownloads: 50000000 },
  { name: 'glob-parent',      version: '5.1.2',  description: 'Extract the non-magic parent path from a glob string',  license: 'ISC',    weeklyDownloads: 60000000 },
  { name: 'semver',           version: '7.5.2',  description: 'The semantic versioner for npm',                        license: 'ISC',    weeklyDownloads: 120000000 },
  { name: 'tough-cookie',     version: '4.1.2',  description: 'RFC6265 Cookies and Cookie Jar for node.js',            license: 'BSD-3-Clause', weeklyDownloads: 25000000 },
  { name: 'word-wrap',        version: '1.2.3',  description: 'Wrap words to a specified length',                      license: 'MIT',    weeklyDownloads: 55000000 },
]

const cves = [
  {
    id: 'CVE-2022-24999',
    severity: 'HIGH',
    cvss: 7.5,
    title: 'Prototype Pollution in qs',
    description: 'qs before 6.10.3 allows prototype pollution by crafting a query string that can alter the prototype of the resulting object.',
    publishedAt: '2022-11-26',
    patchedIn: '6.11.0',
  },
  {
    id: 'CVE-2021-23343',
    severity: 'HIGH',
    cvss: 7.5,
    title: 'ReDoS in path-to-regexp',
    description: 'All versions of path-to-regexp <=0.1.7 are vulnerable to ReDoS via pathMatch regex.',
    publishedAt: '2021-05-04',
    patchedIn: null,
  },
  {
    id: 'CVE-2022-25858',
    severity: 'CRITICAL',
    cvss: 9.8,
    title: 'Prototype Pollution in minimist',
    description: 'The minimist package before 1.2.6 is vulnerable to Prototype Pollution via file index.js, function setKey().',
    publishedAt: '2022-07-15',
    patchedIn: '1.2.6',
  },
  {
    id: 'CVE-2022-0235',
    severity: 'MEDIUM',
    cvss: 6.1,
    title: 'Exposure of Sensitive Info in node-fetch',
    description: 'node-fetch is vulnerable to exposure of sensitive information to an unauthorized actor. Affected versions: node-fetch before 2.6.7.',
    publishedAt: '2022-01-16',
    patchedIn: '2.6.7',
  },
  {
    id: 'CVE-2021-35065',
    severity: 'HIGH',
    cvss: 7.5,
    title: 'ReDoS in glob-parent',
    description: 'The glob-parent package before 6.0.1 for Node.js allows ReDoS (regular expression denial of service) attacks against glob.hasMagic.',
    publishedAt: '2021-12-03',
    patchedIn: '6.0.1',
  },
  {
    id: 'CVE-2022-25883',
    severity: 'HIGH',
    cvss: 7.5,
    title: 'Regular Expression Denial of Service in semver',
    description: 'Versions of semver package before 7.5.2 on the 7.x branch are vulnerable to ReDoS.',
    publishedAt: '2023-06-21',
    patchedIn: '7.5.2',
  },
  {
    id: 'CVE-2023-26136',
    severity: 'CRITICAL',
    cvss: 9.8,
    title: 'Prototype Pollution in tough-cookie',
    description: 'Versions of tough-cookie prior to 4.1.3 are vulnerable to Prototype Pollution via CookieJar.',
    publishedAt: '2023-07-01',
    patchedIn: '4.1.3',
  },
  {
    id: 'CVE-2023-26141',
    severity: 'HIGH',
    cvss: 7.5,
    title: 'ReDoS in word-wrap',
    description: 'word-wrap < 1.2.4 is vulnerable to Regular Expression Denial of Service.',
    publishedAt: '2023-09-01',
    patchedIn: '1.2.4',
  },
]

// Dependency edges: [dependent, dependency, versionRange]
const dependencies = [
  // express depends on
  ['express', 'body-parser',    '^1.20.2'],
  ['express', 'debug',          '2.6.9'],
  ['express', 'path-to-regexp', '0.1.7'],
  ['express', 'qs',             '6.11.0'],
  ['express', 'accepts',        '~1.3.8'],
  ['express', 'serve-static',   '1.15.0'],

  // body-parser depends on
  ['body-parser', 'raw-body',    '2.5.2'],
  ['body-parser', 'iconv-lite',  '0.0.7'],
  ['body-parser', 'depd',        '2.0.0'],
  ['body-parser', 'debug',       '2.6.9'],
  ['body-parser', 'qs',          '6.11.0'],

  // raw-body depends on
  ['raw-body', 'iconv-lite', '0.4.4'],
  ['raw-body', 'depd',       '2.0.0'],

  // accepts depends on
  ['accepts', 'mime-types', '~2.1.34'],

  // mime-types depends on
  ['mime-types', 'mime-db', '1.52.0'],

  // serve-static depends on
  ['serve-static', 'mime-types', '~2.1.24'],

  // debug depends on
  ['debug', 'ms', '2.1.2'],

  // webpack depends on
  ['webpack', 'acorn',            '^8.7.1'],
  ['webpack', 'enhanced-resolve', '^5.15.0'],
  ['webpack', 'tapable',          '^2.1.1'],
  ['webpack', 'terser-webpack-plugin', '^5.3.10'],
  ['webpack', 'glob-parent',      '^6.0.1'],

  // terser-webpack-plugin depends on
  ['terser-webpack-plugin', 'semver', '^7.5.2'],

  // eslint depends on
  ['eslint', 'glob-parent',   '^6.0.1'],
  ['eslint', 'semver',        '^7.5.4'],
  ['eslint', 'word-wrap',     '~1.2.3'],
  ['eslint', 'debug',         '^4.3.2'],
  ['eslint', 'minimist',      '^1.2.6'],
  ['eslint', 'acorn',         '^8.9.0'],

  // axios depends on
  ['axios', 'node-fetch',   '^2.6.7'],
  ['axios', 'tough-cookie', '^4.1.2'],
  ['axios', 'mime-types',   '^2.1.35'],

  // babel-core depends on
  ['babel-core', 'semver',   '^7.3.4'],
  ['babel-core', 'minimist', '^1.2.5'],
  ['babel-core', 'debug',    '^4.1.0'],

  // lodash (no deps)
  // react (no deps in this model)
  // typescript (no deps in this model)
]

// Vulnerability assignments: [packageName, cveId]
const vulnerabilities = [
  ['qs',           'CVE-2022-24999'],
  ['path-to-regexp','CVE-2021-23343'],
  ['minimist',     'CVE-2022-25858'],
  ['node-fetch',   'CVE-2022-0235'],
  ['glob-parent',  'CVE-2021-35065'],
  ['semver',       'CVE-2022-25883'],
  ['tough-cookie', 'CVE-2023-26136'],
  ['word-wrap',    'CVE-2023-26141'],
]

// Maintainer assignments: [maintainerId, packageName]
const maintains = [
  ['m1', 'chalk'], ['m1', 'debug'], ['m1', 'ms'],
  ['m2', 'express'], ['m2', 'body-parser'], ['m2', 'accepts'],
  ['m3', 'node-fetch'], ['m3', 'minimist'],
  ['m4', 'semver'], ['m4', 'glob-parent'],
  ['m5', 'acorn'],
  ['m6', 'react'],
  ['m7', 'babel-core'],
  ['m8', 'webpack'], ['m8', 'tapable'],
]

// ---------------------------------------------------------------------------
// Seeding functions
// ---------------------------------------------------------------------------

async function clearDatabase(session) {
  console.log('🧹  Clearing existing data...')
  await session.run('MATCH (n) DETACH DELETE n')
}

async function createConstraints(session) {
  console.log('📐  Creating constraints and indexes...')
  const queries = [
    'CREATE CONSTRAINT package_name IF NOT EXISTS FOR (p:Package) REQUIRE p.name IS UNIQUE',
    'CREATE CONSTRAINT cve_id IF NOT EXISTS FOR (c:CVE) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT maintainer_id IF NOT EXISTS FOR (m:Maintainer) REQUIRE m.id IS UNIQUE',
  ]
  for (const q of queries) {
    await session.run(q)
  }
}

async function seedMaintainers(session) {
  console.log(`👤  Seeding ${maintainers.length} maintainers...`)
  for (const m of maintainers) {
    // Parameterised — no string interpolation
    await session.run(
      `MERGE (m:Maintainer { id: $id })
       SET m.name   = $name,
           m.email  = $email,
           m.github = $github`,
      m
    )
  }
}

async function seedPackages(session) {
  console.log(`📦  Seeding ${packages.length} packages...`)
  for (const pkg of packages) {
    await session.run(
      `MERGE (p:Package { name: $name })
       SET p.version         = $version,
           p.description     = $description,
           p.license         = $license,
           p.weeklyDownloads = $weeklyDownloads`,
      pkg
    )
  }
}

async function seedCVEs(session) {
  console.log(`🔴  Seeding ${cves.length} CVEs...`)
  for (const cve of cves) {
    await session.run(
      `MERGE (c:CVE { id: $id })
       SET c.severity    = $severity,
           c.cvss        = $cvss,
           c.title       = $title,
           c.description = $description,
           c.publishedAt = $publishedAt,
           c.patchedIn   = $patchedIn`,
      cve
    )
  }
}

async function seedDependencies(session) {
  console.log(`🔗  Seeding ${dependencies.length} dependency relationships...`)
  for (const [from, to, range] of dependencies) {
    await session.run(
      `MATCH (a:Package { name: $from }), (b:Package { name: $to })
       MERGE (a)-[r:DEPENDS_ON]->(b)
       SET r.versionRange = $range`,
      { from, to, range }
    )
  }
}

async function seedVulnerabilities(session) {
  console.log(`⚠️   Seeding ${vulnerabilities.length} vulnerability relationships...`)
  for (const [pkgName, cveId] of vulnerabilities) {
    await session.run(
      `MATCH (p:Package { name: $pkgName }), (c:CVE { id: $cveId })
       MERGE (p)-[:HAS_VULNERABILITY]->(c)`,
      { pkgName, cveId }
    )
  }
}

async function seedMaintains(session) {
  console.log(`🛠️   Seeding ${maintains.length} maintainer relationships...`)
  for (const [mId, pkgName] of maintains) {
    await session.run(
      `MATCH (m:Maintainer { id: $mId }), (p:Package { name: $pkgName })
       MERGE (m)-[:MAINTAINS]->(p)`,
      { mId, pkgName }
    )
  }
}

async function printStats(session) {
  // Static query — no user input interpolated, so template literal is safe here.
  // All data-loading queries above use parameterised $placeholders.
  const result = await session.run(`
    MATCH (p:Package) WITH count(p) AS packages
    MATCH (c:CVE)     WITH packages, count(c) AS cves
    MATCH (m:Maintainer) WITH packages, cves, count(m) AS maintainers
    MATCH ()-[r:DEPENDS_ON]->()      WITH packages, cves, maintainers, count(r) AS deps
    MATCH ()-[r:HAS_VULNERABILITY]->() WITH packages, cves, maintainers, deps, count(r) AS vulns
    RETURN packages, cves, maintainers, deps, vulns
  `)
  const s = result.records[0].toObject()
  console.log('\n✅  Seed complete!')
  console.log(`   Packages:      ${s.packages}`)
  console.log(`   CVEs:          ${s.cves}`)
  console.log(`   Maintainers:   ${s.maintainers}`)
  console.log(`   Dependencies:  ${s.deps}`)
  console.log(`   Vulnerabilities: ${s.vulns}`)
}

async function main() {
  console.log('🚀  DepGraph seed script starting...')
  console.log(`   URI: ${URI}\n`)

  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE })

  try {
    await clearDatabase(session)
    await createConstraints(session)
    await seedMaintainers(session)
    await seedPackages(session)
    await seedCVEs(session)
    await seedDependencies(session)
    await seedVulnerabilities(session)
    await seedMaintains(session)
    await printStats(session)
  } catch (err) {
    console.error('❌  Seed failed:', err.message)
    process.exit(1)
  } finally {
    await session.close()
    await driver.close()
  }
}

main()
