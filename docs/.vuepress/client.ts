import { defineClientConfig } from 'vuepress/client';
import RepoCard from 'vuepress-theme-plume/features/RepoCard.vue';

// @ts-ignore
import './styles/index.css'

// noinspection JSUnusedGlobalSymbols
export default defineClientConfig({
    enhance({ app }) {
        app.component('RepoCard', RepoCard)
    },
});
