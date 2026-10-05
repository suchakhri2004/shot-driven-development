import { createApp } from './app'
import { loadConfig } from './config'

const config = loadConfig()
const { httpServer, webEnabled, close } = createApp(config)

httpServer.listen(config.port, () => {
  console.log(`Shot-Driven Development server on http://localhost:${config.port}`)
  console.log(
    webEnabled
      ? 'Web app is served from this same port: open the address above to play.'
      : 'Web app not built (run `npm run build:web`), or use `npm run dev:web` for development.'
  )
})

// Hosts (Render, Docker, …) stop the app with SIGTERM: close sockets cleanly instead of being killed mid-write.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    console.log(`${signal} received, shutting down`)
    void close().then(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  })
}
