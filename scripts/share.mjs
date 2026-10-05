// Opens a FREE public https link to the game running on this computer, using a Cloudflare quick tunnel.
// No account, no credit card, nothing to pay. Friends open the printed link on their phones.
//
//   terminal 1:  npm run play
//   terminal 2:  npm run share
import { spawn, spawnSync } from 'node:child_process'

const port = process.env.PORT ?? 3210
const shell = process.platform === 'win32'

const installed = spawnSync('cloudflared', ['--version'], { shell, stdio: 'ignore' }).status === 0
if (!installed) {
  console.error(`
cloudflared (the free tunnel tool) is not installed or not on PATH.
Install it once, for free:
  Windows : winget install Cloudflare.cloudflared
  macOS   : brew install cloudflared
  Linux   : https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
Then run "npm run share" again and open the https://....trycloudflare.com link it prints.
`)
  process.exit(1)
}

console.log(`Opening a free public link to http://localhost:${port} (keep "npm run play" running)…`)
spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], { shell, stdio: 'inherit' }).on('exit', (code) =>
  process.exit(code ?? 0)
)
