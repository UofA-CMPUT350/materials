import { viteBundler } from '@vuepress/bundler-vite'
import { defineUserConfig } from 'vuepress'
import { plumeTheme } from 'vuepress-theme-plume'

const base = process.env.NODE_ENV === "production" ? '/cmput350/' : '/';

// noinspection JSUnusedGlobalSymbols
export default defineUserConfig({
  base,
  lang: 'en-US',
  title: 'CMPUT 350: Advanced Games Programming',
  description: 'Notes and lab preparatory materials for CMPUT 350 (Advanced Games Programming) Fall 2026 at the University of Alberta',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}static/favicon.png` }],
  ],
  bundler: viteBundler(),
  shouldPrefetch: false,
  theme: plumeTheme({
    autoFrontmatter: false,
    readingTime: false,
    lastUpdated: false,
    contributors: false,
    markdown: {
      pdf: true
    }
  }),
})
