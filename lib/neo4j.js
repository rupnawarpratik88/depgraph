import neo4j from 'neo4j-driver'

// Read connection details from environment variables only.
// These are NEVER hardcoded or string-interpolated.
const URI      = process.env.NEO4J_URI
const USERNAME = process.env.NEO4J_USERNAME
const PASSWORD = process.env.NEO4J_PASSWORD

if (!URI || !USERNAME || !PASSWORD) {
  throw new Error(
    'Missing CognoDB connection environment variables. ' +
    'Copy .env.example to .env.local and fill in your CognoDB credentials.'
  )
}

// Singleton pattern: reuse the same driver across all API route invocations.
// Next.js hot-reload can re-execute module code, so we attach the driver
// to the global object in development to prevent connection pool exhaustion.
let driver

if (process.env.NODE_ENV === 'development') {
  if (!global._neo4jDriver) {
    global._neo4jDriver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD), {
      maxConnectionPoolSize: 10,
    })
  }
  driver = global._neo4jDriver
} else {
  driver = neo4j.driver(URI, neo4j.auth.basic(USERNAME, PASSWORD), {
    maxConnectionPoolSize: 10,
  })
}

export default driver

/**
 * Run a parameterised read query and return records as plain objects.
 * ALL queries go through this function — no string-concatenated Cypher anywhere.
 *
 * @param {string} cypher  - The Cypher query string with $param placeholders
 * @param {object} params  - Parameter map passed to the driver (never interpolated)
 * @returns {Promise<Array>} Array of record objects
 */
export async function runQuery(cypher, params = {}) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ })
  try {
    const result = await session.run(cypher, params)
    return result.records.map(record => record.toObject())
  } finally {
    await session.close()
  }
}

/**
 * Run a parameterised write query (for seed script).
 * Separated from reads so write sessions are explicit and intentional.
 */
export async function runWriteQuery(cypher, params = {}) {
  const session = driver.session({ defaultAccessMode: neo4j.session.WRITE })
  try {
    const result = await session.run(cypher, params)
    return result.records.map(record => record.toObject())
  } finally {
    await session.close()
  }
}

/**
 * Verify the database connection is alive.
 * Used by API routes to return a graceful error when DB is unreachable.
 */
export async function verifyConnectivity() {
  await driver.verifyConnectivity()
}
