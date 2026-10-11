import { defineThemeConfig } from "vuepress-theme-plume"
import { readdirSync } from "node:fs";

// noinspection JSUnusedGlobalSymbols
export default defineThemeConfig({
    footer: false,
    navbar: [
        { text: "Home", link: "/" },
        {
            text: "Labs",
            activeMatch: "/lab/",
            items: readdirSync("docs/lab/", { withFileTypes: true })
                .filter(entry => entry.isDirectory())
                .map((dir) => {
                    return {
                        text: `Lab ${dir.name}`,
                        link: `/lab/${dir.name}/`
                    }
                })
        }
    ],
    outline: "deep"
})
