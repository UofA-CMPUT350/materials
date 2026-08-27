/**
 * View the following documentation for theme configuration
 * - @see https://theme-plume.vuejs.press/config/intro/ Configuration guide
 * - @see https://theme-plume.vuejs.press/config/theme/ Theme configuration items
 *
 * Please note that modifications to this file will restart the vuepress service.
 * Some configuration updates do not require restarting the vuepress service. It is recommended to configure them in the `.vuepress/config.ts` file.
 *
 * In particular, do not duplicate the same configuration items in both configuration files, as the configuration items in the current file will be overwritten.
 */

import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'

// noinspection JSUnusedGlobalSymbols
export default defineUserConfig({
  base: '/',
  lang: 'en-US',
  title: 'CMPUT350',
  description: '',

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: 'https://theme-plume.vuejs.press/favicon-32x32.png' }],
  ],

  bundler: viteBundler(),
  shouldPrefetch: false,

  theme: plumeTheme(),
})
