import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliDecompressSync, gunzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startTestServer } from './helpers'

let dir: string
let server: Awaited<ReturnType<typeof startTestServer>>

/** Raw request: unlike fetch(), it does not tidy up ".." in the path, so we can attack the server. */
function rawGet(path: string): Promise<{ status: number; body: string; type: string | undefined }> {
  return new Promise((resolve, reject) => {
    const url = new URL(server.url)
    get({ host: url.hostname, port: url.port, path }, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, type: res.headers['content-type'] }))
    }).on('error', reject)
  })
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sdd-web-'))
  mkdirSync(join(dir, '_nuxt'))
  writeFileSync(join(dir, 'index.html'), '<title>index</title>')
  writeFileSync(join(dir, '200.html'), '<title>spa shell</title>')
  writeFileSync(join(dir, '_nuxt', 'app.js'), 'console.log(1)')
  writeFileSync(join(dir, '..', 'sdd-secret.txt'), 'top secret')
  server = await startTestServer({ WEB_DIR: dir })
})
afterAll(async () => {
  await server.close()
  rmSync(dir, { recursive: true, force: true })
  rmSync(join(dir, '..', 'sdd-secret.txt'), { force: true })
})

describe('serving the built web app from the game server', () => {
  it('serves the app shell, assets with the right type, and reports itself in /health', async () => {
    expect(await rawGet('/')).toMatchObject({ status: 200, body: '<title>spa shell</title>' })
    expect(await rawGet('/_nuxt/app.js')).toMatchObject({ status: 200, type: 'text/javascript; charset=utf-8' })
    const health = JSON.parse((await rawGet('/health')).body)
    expect(health).toMatchObject({ ok: true, web: true })
  })

  it('falls back to the app shell for room links, but 404s for missing files', async () => {
    expect((await rawGet('/room/ABC123')).body).toBe('<title>spa shell</title>')
    expect((await rawGet('/missing.js')).status).toBe(404)
  })

  it('never serves files outside the web folder', async () => {
    for (const path of ['/../sdd-secret.txt', '/..%2fsdd-secret.txt', '/%2e%2e/sdd-secret.txt', '/_nuxt/../../sdd-secret.txt']) {
      const res = await rawGet(path)
      expect(res.body, path).not.toContain('top secret')
    }
  })

  it('sends text files compressed when the browser accepts it', async () => {
    const url = new URL(server.url)
    const fetchEncoded = (encoding: string) =>
      new Promise<{ encoding?: string; body: Buffer }>((resolve, reject) => {
        get({ host: url.hostname, port: url.port, path: '/_nuxt/app.js', headers: { 'accept-encoding': encoding } }, (res) => {
          const chunks: Buffer[] = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve({ encoding: res.headers['content-encoding'], body: Buffer.concat(chunks) }))
        }).on('error', reject)
      })
    const br = await fetchEncoded('gzip, deflate, br')
    expect(br.encoding).toBe('br')
    expect(brotliDecompressSync(br.body).toString()).toBe('console.log(1)')
    const gz = await fetchEncoded('gzip')
    expect(gz.encoding).toBe('gzip')
    expect(gunzipSync(gz.body).toString()).toBe('console.log(1)')
    const plain = await fetchEncoded('identity')
    expect(plain.encoding).toBeUndefined()
    expect(plain.body.toString()).toBe('console.log(1)')
  })

  it('survives malformed URLs instead of crashing', async () => {
    expect((await rawGet('/%E0%A4%A')).status).toBe(400)
    expect((await rawGet('/health')).status).toBe(200)
  })

  it('still answers the websocket transport path (not swallowed by the static handler)', async () => {
    const res = await rawGet('/socket.io/?EIO=4&transport=polling')
    expect(res.status).toBe(200)
    expect(res.body).toContain('sid')
  })
})
