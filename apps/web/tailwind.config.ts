import type { Config } from 'tailwindcss'

/*
 * "Dive bar after deploy" palette: red and black, with paper cream as the second colour. Flat, print-like.
 * Token names are kept stable (neon, amber, …) so components do not have to change when the palette does.
 */
export default {
  content: [],
  theme: {
    extend: {
      colors: {
        bg: '#0e0a0b', // night
        panel: '#171113', // wall
        panel2: '#221a1c',
        line: '#3b2a2c',
        ink: '#f3e7cc', // main text colour on dark: paper cream
        dim: '#a08f8b',
        neon: '#ff4d52', // light red: highlights, titles, the room code
        amber: '#e3242b', // red: the main action colour (buttons, costs, Shot Stack)
        violet: '#9b70ee',
        hotfix: '#ef4b3f',
        freeze: '#4b9cf0',
        deploy: '#f6c93d',
        danger: '#ef4b3f',
        paper: '#f3e7cc',
        shade: '#050304' // outline / hard shadow
      },
      fontFamily: {
        display: ['Kanit', '"IBM Plex Sans Thai"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans Thai"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config
