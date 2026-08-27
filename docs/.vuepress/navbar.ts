/**
 * @see https://theme-plume.vuejs.press/config/navigation/ View the documentation for configuration details
 *
 * Navbar configuration file, which is imported in `.vuepress/plume.config.ts`.
 */

import { defineNavbarConfig } from 'vuepress-theme-plume'

export default defineNavbarConfig([
  { text: 'Home', link: '/' },
  { text: 'Blog', link: '/blog/' },
  { text: 'Tags', link: '/blog/tags/' },
  { text: 'Archives', link: '/blog/archives/' },
  {
    text: 'Notes',
    items: [{ text: 'Demo', link: '/demo/README.md' }]
  },
])
