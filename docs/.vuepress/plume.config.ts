/**
 * See the following documentation for theme configuration
 * - @see https://theme-plume.vuejs.press/config/intro/ Configuration instructions
 * - @see https://theme-plume.vuejs.press/config/theme/ Theme configuration items
 *
 * Please note that modifications to this file will not restart the vuepress service, but will take effect through hot updates.
 * However, some configuration items do not support hot updates; please refer to the documentation for details.
 * For configuration items that do not support hot updates, please configure them in the `.vuepress/config.ts` file.
 *
 * In particular, do not duplicate the same configuration items in both configuration files. The configuration items in this file will override those in the `.vuepress/config.ts` file.
 */

import { defineThemeConfig } from 'vuepress-theme-plume'
import collections from './collections'
import navbar from './navbar'

/**
 * @see https://theme-plume.vuejs.press/config/theme/
 */
export default defineThemeConfig({
  logo: 'https://theme-plume.vuejs.press/plume.png',

  social: [
    { icon: 'github', link: '/' },
  ],

  /**
   * @see https://theme-plume.vuejs.press/config/theme/#profile
   */
  profile: {
    avatar: 'https://theme-plume.vuejs.press/plume.png',
    name: 'CMPUT 350: Advanced Games Programming',
    description: '',
  },

  navbar,
  collections,

})
