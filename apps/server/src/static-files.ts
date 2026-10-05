import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
}
/** Text files shrink a lot when compressed; fonts (woff2) and images are already compressed. */
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt'])

interface Encoded {
  mtime: number
  raw: Buffer
  br: Buffer
  gzip: Buffer
}

/**
 * Serves the built web app (apps/web/.output/public) from the game server itself, so the whole game
 * is ONE process on ONE port. That makes free hosting trivial (a single tunnel or free web service).
 * Text files are sent brotli/gzip compressed (compressed once, then kept in memory).
 * Unknown paths fall back to the single-page-app shell so /room/ABC123 links work.
 */
export function createStaticHandler(rootDir: string) {
  const root = resolve(rootDir)
  const enabled = existsSync(join(root, 'index.html'))
  const shell = existsSync(join(root, '200.html')) ? join(root, '200.html') : join(root, 'index.html')
  const cache = new Map<string, Encoded>()

  function encoded(file: string): Encoded {
    const mtime = statSync(file).mtimeMs
    const hit = cache.get(file)
    if (hit && hit.mtime === mtime) return hit
    const raw = readFileSync(file)
    const entry = {
      mtime,
      raw,
      br: brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } }),
      gzip: gzipSync(raw, { level: 9 })
    }
    cache.set(file, entry)
    return entry
  }

  function send(req: IncomingMessage, res: ServerResponse, file: string, immutable: boolean): void {
    const ext = extname(file)
    const headers: Record<string, string> = {
      'content-type': MIME[ext] ?? 'application/octet-stream',
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      vary: 'accept-encoding'
    }
    if (!COMPRESSIBLE.has(ext)) {
      res.writeHead(200, headers)
      if (req.method === 'HEAD') return void res.end()
      createReadStream(file).pipe(res)
      return
    }
    const accept = String(req.headers['accept-encoding'] ?? '')
    const entry = encoded(file)
    const [body, encoding] = /\bbr\b/.test(accept) ? [entry.br, 'br'] : /\bgzip\b/.test(accept) ? [entry.gzip, 'gzip'] : [entry.raw, null]
    if (encoding) headers['content-encoding'] = encoding
    headers['content-length'] = String(body.length)
    res.writeHead(200, headers)
    res.end(req.method === 'HEAD' ? undefined : body)
  }

  function handle(req: IncomingMessage, res: ServerResponse): boolean {
    if (!enabled || (req.method !== 'GET' && req.method !== 'HEAD')) return false
    let pathname: string
    try {
      pathname = decodeURIComponent((req.url ?? '/').split('?')[0])
    } catch {
      // malformed %-escapes must not crash the server
      res.writeHead(400).end()
      return true
    }
    // resolve inside the root only: ".." tricks must never escape it
    const candidate = resolve(root, '.' + normalize(pathname))
    if (candidate !== root && !candidate.startsWith(root + sep)) {
      res.writeHead(403).end()
      return true
    }
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      send(req, res, candidate, pathname.startsWith('/_nuxt/'))
      return true
    }
    if (extname(pathname)) {
      res.writeHead(404).end()
      return true
    }
    send(req, res, shell, false)
    return true
  }

  return { enabled, handle }
}
