<template>
  <div class="comment-wrap" v-if="show">
    <span class="leancloud_visitors visitor_container" :id="visitIid" :data-flag-title="title">
      <span class="post-meta-item-text">阅读量：</span>
      <i class="leancloud-visitors-count" style="font-style:normal"></i>
    </span>
    <div id="commentEl" class="comment">
      <p>这是评论区别</p>
    </div>
  </div>
</template>

<script>
// import Valine from 'valine'
import { valineComment } from '../private.js'

export default {
  name: 'comment',
  data() {
    return {
      show: false,
      visitIid:0,
      articleTitle:'',
      title:""
    }
  },
  mounted() {   
    import('valine').then(module => {
      window.Valine = module.default
      this.fetchComment()
    })
  },
  methods: {
    fetchComment() {
      // 目录页面不显示评论
      let path = location.pathname
      this.title = path
      // document.getElementsByClassName('leancloud-visitors')[0].id = path
      this.visitIid = path;
      this.show = /.html$/.test(this.$route.path)
      
      this.show &&
        this.$nextTick(() => {
          new Valine({
            el: '#commentEl',
            appId: valineComment.AppID,
            appKey: valineComment.AppKey,
            path: this.visitIid,
            avatar: 'wavatar',
            meta: ['nick', 'mail'],
            visitor: true
          })
        })

     
    }
  },
  watch: {
    $route: function(route, oldroute) {
      if(route.path === oldroute.path) return
      console.log('route gengxx', route, oldroute)
      this.fetchComment()
    }
  }
}
</script>


<style scoped>
.comment-wrap {
  max-width: 800px;
  padding-left: 20rem;
}
.visitor_container,
.comment {
  padding: 0 2.5rem 4rem;
}
@media (max-width: 959px) {
  .comment-wrap {
    padding-left: 16.4rem;
  }
}
@media (max-width: 719px) {
  .comment-wrap {
    padding-left: 0;
  }
}
@media (max-width: 959px) {
  .comment {
    padding: 0 2rem 2rem;
  }
}
@media (max-width: 419px) {
  .comment {
    padding: 0 1.5rem 1.5rem;
  }
}
</style>

<style>
.v .vlist .vcard .vhead .vsys {
  display: none !important;
}
.v .veditor {
  min-height: 3.75em !important;
}
#commentEl .info{
  display: none;
}
</style>

 