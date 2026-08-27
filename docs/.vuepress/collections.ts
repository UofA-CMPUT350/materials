/**
 * @see https://theme-plume.vuejs.press/guide/collection/ View documentation for configuration details.
 *
 * Collections configuration file, which is imported in `.vuepress/plume.config.ts`.
 *
 * Please note that you should configure Collections here first, then start vuepress.
 * The theme will, upon starting vuepress, read the Collections configured here and automatically generate permalinks in Markdown files related to the Collections.
 *
 * When the `type` of a collection is `post`, it represents a document list type (i.e., no sidebar navigation, with a document list page).
 * This can be used to implement document collections aggregated as article lists, such as blogs or columns (relatively fragmented content).
 *
 * When the `type` of a collection is `doc`, it represents a document type (i.e., with sidebar navigation).
 * This can be used to implement document collections with sidebar navigation, such as notes, knowledge bases, or documentation (strongly correlated and systematic content).
 * If the sidebar does not appear, please check if your configuration is correct and whether the permalink in the Markdown file
 * starts with the prefix of the corresponding Collection's configured `link`. Whether the sidebar is displayed is determined by
 * matching the prefix of the page link with the prefix of `collection.link`.
 */

/**
 * Configuration items will be intelligently prompted in supported IDEs.
 *
 * - `defineCollections` is a helper function for defining a set of collections.
 * - `defineCollection` is a helper function for defining a single collection configuration.
 *
 * Collection configurations defined using `defineCollection` should be placed inside `defineCollections`.
 */
import { defineCollection, defineCollections } from 'vuepress-theme-plume'

const blog = defineCollection({
  type: 'post',
  dir: 'blog',
  title: 'Blog',
  link: '/blog/',
})

const demoDoc = defineCollection({
  type: 'doc',
  dir: 'demo',
  linkPrefix: '/demo',
  title: 'Demo',
  sidebar: ['', 'foo', 'bar'],
  // Auto-generate sidebar based on file structure
  // sidebar: 'auto',
})

export default defineCollections([
  blog,
  demoDoc,
])
