import { postgres } from './deps.ts'
/**
 * Handle PostGres Database actions
 * postgres://postgres:postgrespw@localhost:49153
 */
const POOL_CONNECTIONS = 10
const db_params = {
  connection: {
    attempts: 2,
  },
  database: 'azvocab',
  hostname: '127.0.0.1',
  password: '123456',
  port: 49153,
  user: 'zavocab',
}
const dbPool = new postgres.Pool(db_params, POOL_CONNECTIONS, true) // `true` indicates lazy connections

export async function runQuery(query, args) {
  const client = await dbPool.connect()
  let result
  try {
    result = await client.queryObject(query, args)
  } finally {
    client.release()
  }
  return result
}
