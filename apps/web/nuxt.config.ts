export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  // same strictness as packages/engine (Nuxt 4 additionally enables noUncheckedIndexedAccess)
  typescript: { tsConfig: { compilerOptions: { noUncheckedIndexedAccess: false } } },
  modules: ['@nuxtjs/tailwindcss'],
  css: [
    // fonts are bundled with the game (OFL licensed): no request to Google, works offline, faster first paint
    '@fontsource/kanit/500.css',
    '@fontsource/kanit/700.css',
    '@fontsource/kanit/800.css',
    '@fontsource/ibm-plex-sans-thai/400.css',
    '@fontsource/ibm-plex-sans-thai/600.css',
    '@fontsource/jetbrains-mono/500.css',
    '@fontsource/jetbrains-mono/800.css',
    '~/assets/css/game.css'
  ],
  components: [{ path: '~/components', pathPrefix: false }],
  runtimeConfig: {
    public: {
      // Leave empty: in dev the web app talks to the game server on the same host (port 3210);
      // the production build talks to the server it was loaded from.
      serverUrl: ''
    }
  },
  app: {
    head: {
      title: 'Shot-Driven Development',
      htmlAttrs: { lang: 'th' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no' },
        { name: 'theme-color', content: '#0e0a0b' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'description', content: 'เกมการ์ดดื่มออนไลน์ 2–6 คน สำหรับชาว dev' }
      ],
      link: [
        // tab icon: a little shot glass drawn inline in SVG (red shot, ink outline), no image file
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230e0a0b'/%3E%3Cpath d='M14 12h36l-5 40H19z' fill='%23f3e7cc' stroke='%23120d18' stroke-width='4' stroke-linejoin='round'/%3E%3Cpath d='M17.5 28h29l-3 22h-23z' fill='%23e3242b'/%3E%3Cpath d='M14 12h36l-5 40H19z' fill='none' stroke='%23120d18' stroke-width='4' stroke-linejoin='round'/%3E%3C/svg%3E"
        }
      ]
    }
  }
})
