<template>
    <div class="update_dialog" v-if="title && updateList.length && visible">
        <div class="update_container" ref="dialogBox">
            <div class="title">{{ title }}</div>
            <div class="route" v-for="(item, index) in updateList" :key="index">
                <div class="left_line">
                    <span class="line"></span>
                </div>
                <div class="right_content">
                    <h4 class="time">{{ item.time }}</h4>
                    <router-link
                        ref="link"
                        :to="link.url"
                        class="article_link"
                        v-for="(link, idx) in item.content"
                        :key="idx"
                        >{{ link.title }}</router-link
                    >
                </div>
            </div>
            <div class="footer_bottom">
               如果您有任何建议, 欢迎加好友私聊
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'update',
        data() {
            return {
                visible: false,
            }
        },

        mounted() {
            if (this.$themeConfig.update && this.$themeConfig.update.time) {
                const updateTime = this.$themeConfig.update.time
                if (!window.localStorage) {
                    // 设置cookie
                    const lastTime = this.getCookie('update_time')
                    if (lastTime == updateTime) {
                        this.visible = false
                    } else {
                        this.setCookie('update_time', updateTime)
                        this.visible = true
                    }
                } else {
                    // 设置localStorage
                    console.log('设置localStorage')
                    const lastTime = window.localStorage.getItem('update_time')
                    if (lastTime == updateTime) {
                        this.visible = false
                    } else {
                        this.visible = true
                        window.localStorage.setItem('update_time', updateTime)
                    }
                }
            }else{
                this.visible = false
            }
            this.$nextTick(() => {
                if (!this.visible) return
                document.addEventListener('click', this.closeDialog)
            })
        },

        computed: {
            title() {
                if (
                    this.$themeConfig.update &&
                    this.$themeConfig.update.title
                ) {
                    return this.$themeConfig.update.title
                } else {
                    return null
                }
            },
            updateList() {
                if (
                    this.$themeConfig.update &&
                    this.$themeConfig.update.updateList
                ) {
                    return this.$themeConfig.update.updateList
                } else {
                    return []
                }
            },
        },

        methods: {
            setCookie(name, value, seconds) {
                seconds = seconds || 0 //seconds有值就直接赋值，没有为0
                var expires = ''
                if (seconds != 0) {
                    //设置cookie生存时间
                    var date = new Date()
                    date.setTime(date.getTime() + seconds * 1000)
                    expires = '; expires=' + date.toGMTString()
                }
                document.cookie =
                    name + '=' + escape(value) + expires + '; path=/' //转码并赋值
            },

            getCookie(c_name) {
                if (document.cookie.length > 0) {
                    var c_start = document.cookie.indexOf(c_name + '=')
                    if (c_start != -1) {
                        c_start = c_start + c_name.length + 1
                        var c_end = document.cookie.indexOf(';', c_start)
                        if (c_end == -1) c_end = document.cookie.length
                        return unescape(
                            document.cookie.substring(c_start, c_end)
                        ).replace(/\"/g, '')
                    }
                }
                return null
            },

            closeDialog(e) {
                const dialog = this.$refs.dialogBox
                const link = this.$refs.link
                // 点击 蒙层以及文章链接关闭
                if (
                    (dialog && !dialog.contains(e.target)) ||
                    e.target.className == 'article_link'
                ) {
                    this.visible = false
                    // remove event
                    this.removeEvent()
                }
            },
            removeEvent() {
                document.removeEventListener('click', this.closeDialog)
            },
        },
    }
</script>

<style scoped>
    .update_dialog {
        position: fixed;
        width: 100%;
        height: 100%;
        left: 0;
        top: 0;
        z-index: 99;
        background-color: rgba(0, 0, 0, 0.5);
    }
    .update_container {
        width: 80%;
        max-width: 500px;
        background-color: #fff;
        padding: 20px;
        box-sizing: border-box;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        border-radius: 8px;
    }
    .update_container .title {
        font-size: 16px;
        border-bottom: 1px solid #eee;
        line-height: 40px;
        font-weight: bold;
        margin-bottom: 20px;
    }
    .update_container .route {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        flex-flow: row;
    }
    .right_content {
        flex: 1;
        display: flex;
        flex-direction: column;
    }
    .right_content .time {
        margin: 0;
        margin-top: -4px;
    }
    .right_content .article_link {
        font-size: 14px;
        margin-top: 10px;
    }
    .right_content .article_link:last-child {
        margin-bottom: 15px;
    }
    .route .left_line {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: 16px;
    }
    .route .left_line::before {
        content: ' ';
        display: inline-block;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #42b983;
        background-color: #fff;
        box-sizing: border-box;
        flex-shrink: 0;
    }
    .route .left_line .line {
        display: inline-block;
        height: 100%;
        width: 2px;
        background-color: #eee;
    }
    .footer_bottom{
        font-size: 12px;
        color: #666;
        text-align: center;
        padding: 10px ;
    }
</style>
