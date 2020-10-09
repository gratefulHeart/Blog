const slidebar = require('./config.sidebar')
const update = require('./config.update')

module.exports = {
    title:'GGG的博客',
    description:'iOS开发相关知识经验',
    themeConfig:{
        // serviceWorker: true, // 是否开启 PWA
        logo: '',
        repo: 'https://github.com/gratefulHeart',
        sidebarDepth: 5,
        update: update,
        nav:[{text:"主页",link:"/"}],
        sidebar: slidebar,

    },
    head: [
        ['link', { rel: 'icon', href: `/favicon.ico` }],
        ['link', { rel: 'manifest', href: '/manifest.json' }],
    ],
    shouldPreload: (file, type) => {
        // 基于文件扩展名的类型推断
        // if(type == 'script')
        return false
    },
    // 插件
    plugins: [
        ['@vuepress/back-to-top'], // 返回顶部
        [
            '@vuepress/active-header-links',
            {
                // 页面滚动时自定激活侧边栏链接
                sidebarLinkSelector: '.sidebar-link',
                headerAnchorSelector: '.header-anchor',
            },
        ],
        ['@vuepress/nprogress'],
        ['@vuepress/pwa', {
            serviceWorker: true,
            updatePopup: true
          }],
        require('./common-plugin.js'),

    ],
    chainWebpack: (config, isServer) => {
        // 去除打包后文件的预加载
        config.plugins.delete('html')
        config.plugins.delete('preload') // TODO: need test
        config.plugins.delete('prefetch') // TODO: need test
    },
}

