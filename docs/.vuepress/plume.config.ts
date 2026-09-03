import { defineThemeConfig } from 'vuepress-theme-plume'

// noinspection JSUnusedGlobalSymbols
export default defineThemeConfig({
    footer: false,
    navbar: [
        { text: 'Home', link: '/' },
        {
            text: 'Labs',
            activeMatch: "/lab/",
            items: [{
                text: 'Lab 1',
                link: '/lab/1/',
            }, {
                text: 'Lab 2',
                link: '/lab/2/',
            }]
        }
    ],
})
