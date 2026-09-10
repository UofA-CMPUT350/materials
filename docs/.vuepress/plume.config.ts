import { defineThemeConfig } from 'vuepress-theme-plume'

// noinspection JSUnusedGlobalSymbols
export default defineThemeConfig({
    footer: false,
    navbar: [
        { text: 'Home', link: '/' },
        {
            text: 'Labs',
            activeMatch: "/lab/",
            items: [...Array(3)].map((_, i) => {
                return {
                    text: `Lab ${i + 1}`,
                    link: `/lab/${i + 1}/`
                }
            })
        }
    ],
})
