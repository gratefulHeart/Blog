module.exports = {
    // 自定义plugin,更新提示, 如果不需要直接设置成null
    title: '文章更新',
    time: new Date('2020-10-09').getTime(), // 这个用于记录更新时间， 存在用户浏览器，判断用户是否以及查看了更新消息
    updateList: [
        {
            time: '2020.10.09',
            content: [
                {
                    title: 'iOS启动速度优化-main之前调用延迟的方法',
                    url: '/about/iOSapplaunch-post_main_later',
                },
                {
                    title: 'iOS-启动速度优化之工具篇 System Trace',
                    url: '/about/iOSapplaunch-tools-systemtrace',
                },
            ],
        },
    ],
}