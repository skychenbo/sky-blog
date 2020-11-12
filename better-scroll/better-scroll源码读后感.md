BetterScroll 是一款重点解决移动端各种滚动场景需求的开源插件（GitHub地址），有下列功能
支持滚动列表，下拉刷新，上拉刷新，轮播图，slider等功能。
为了满足这些功能，better-scroll通过使用惯性滚动、边界回弹、滚动条淡入淡出来确保滚动的
流畅。同时还支持很多API和事件，具体支持的事件可以查看官网讲的非常详细。
由于它基于原生JavaScript 实现，不依赖任何框架，所以既可以原生 JavaScript 引用，也可以
与目前前端 MVVM 框架结合使用，比如，其官网上的示例就是与 Vue 的结合。

如何使用：
    再讲如何使用的之前，我们先来了解一下他的滚动原理：在浏览器中的滚动中，当内容的高度
高于外边容器的高度的时候也就出现了滚动条，我们可以通过使用滚动条来看到超出的部分，
better-scroll的原理正是基于这里，内容部分的宽度/高度必须大于外部宽度/高度。所以在使用
的时候外部容器的需要设置固定宽度，还有一个问题需要设置overflow:hidden,这是因为为了隐藏
超出部分。然后就是什么时候对better-scroll进行初始化，这个有点麻烦，但是所幸，作者已经
在vue框架下进行封装，我们只需要像个麻瓜一样往里边填东西就行了。但是有一点需要注意：滚
动的元素只能是第一个容器的第一个元素。源码如下：
  // this.scroller就是滚动的内容，this.wrapper是容器
    this.scroller = this.wrapper.children[0]
如果我们需要滚动多个内容怎么办呢，就用一个元素将其包裹住，让他成为容器的第一个子元素就
行了。
如何使用讲完了，我们来讲讲源码，毕竟这是一个源码解析的文章
核心代码：
    1、scrollTo
    scrollTo()函数是better-scroll非常核心的一个函数，事实上我们在调用scrollToElement的
时候，内部进行的操作还是scrollTo函数
           BScroll.prototype.scrollTo = function (x, y, time=0, easing = ease.bounce) {
                // useTransition是否使用css3 transition,isInTransition表示是否在滚动过程中
                // this.x表示translate后的位置或者初始化this.x = 0
                this.isInTransition = this.options.useTransition
                && time > 0 && (x !== this.x || y !== this.y)

                // 如果使用的transition，就调用一系列transition的设置，默认是true
                if (!time || this.options.useTransition) {
                    this._transitionProperty()
                    this._transitionTimingFunction(easing.style)
                    this._transitionTime(time)
                    // 这个函数会更改this.x
                    this._translate(x, y)

                    // time存在protoType表示不仅在屏幕滑动的时候， momentum 滚动动画运行过程中实时派发 scroll 事件
                    if (time && this.options.probeType === 3) {
                        // 这个函数的作用是派发scroll事件
                        this._startProbe()
                    }

                    // wheel用于picker组件设置,不用管
                    if (this.options.wheel) {
                        if (y > 0) {
                            this.selectedIndex = 0
                        } else if (y < this.maxScrollY) {
                            this.selectedIndex = this.items.length - 1
                        } else {
                            this.selectedIndex = Math.round(Math.abs(y / this.itemHeight))
                        }
                    } else {
                        // 进行动画this._animate
                        this._animate(x, y, time, easing.fn)
                    }
                }
            };
我们来依次看看这个函数，其中简单的操作用代码注明，也就不做太多的描述，其中例如this._transition
这种有关transform的都是改变他的位置而已，这里我需要说明一下，我们在制作轮播图的时候，别去
使用transform这种方法来做轮播图，因为当我们需要获取transform属性值的时候，你会获取到的值是
一个非常奇怪的矩阵，得到translateX或者translateY的值是一件非常痛苦的事，可以看看作者是如何
获取transform的值的，
matrix = matrix[style.transform].split(')')[0].split(', ')
            x = +(matrix[12] || matrix[4])
            y = +(matrix[13] || matrix[5])
我是一脸蒙蔽，要是你觉得你水平很高当我没说。this.options.probeType这个probeType配置表明的是
我们需要在什么情况下派发scroll事件，在better-scroll的原理中是默认阻止浏览器的默认行为的，那
我们是如何派发事件的呢？
        export function tap(e, eventName) {
            let ev = document.createElement('Event')
            ev.initEvent(eventName, true, true)
            e.target.dispatchEvent(ev)
        }
创建一个element,然后初始化，然后派发事件，我们就可以像addEventListener('click', fn, false)
这样的方式来监听事件addEventListener(eventName, fn, false)。
这儿有一个参数叫easing,我们来看看easing是什么
下面是一个easing的一个选项：
 bounce: {
        style: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
        fn: function (t) {
        	return 1 - (--t * t * t * t)
        }
    }
可以看到easing通过贝瑟尔函数，和fn让我们的动画显得不是那么僵硬。贝瑟尔函数可以去看看，他
让动画不再那么突兀。
下面来讲讲
    2、refresh函数
在实际开发中，有时候从后端请求到数据后，我们dom结构发生变化，所以需要调用refresh方法，来
看看他是什么玩意
    BScroll.prototype.refresh = function () {
            // return getBoundingRect getRect()
            let wrapperRect = getRect(this.wrapper)
            this.wrapperWidth = wrapperRect.width
            this.wrapperHeight = wrapperRect.height

            let scrollerRect = getRect(this.scroller)
            this.scrollerWidth = scrollerRect.width
            this.scrollerHeight = scrollerRect.height

            const wheel = this.options.wheel
            // wheel用于picker组件设置
            if (wheel) {
                this.items = this.scroller.children
                this.options.itemHeight = this.itemHeight = this.items.length ? this.scrollerHeight / this.items.length : 0
                if (this.selectedIndex === undefined) {
                    this.selectedIndex = wheel.selectedIndex || 0
                }
                this.options.startY = -this.selectedIndex * this.itemHeight
                this.maxScrollX = 0
                this.maxScrollY = -this.itemHeight * (this.items.length - 1)
            } else {
                // 允许滑动的距离
                this.maxScrollX = this.wrapperWidth - this.scrollerWidth
                this.maxScrollY = this.wrapperHeight - this.scrollerHeight
            }

            // 滚动原理容器的宽度小于scroller的宽度
            // scrollX设置为true表示可以横向滚动
            this.hasHorizontalScroll = this.options.scrollX && this.maxScrollX < 0
            this.hasVerticalScroll = this.options.scrollY && this.maxScrollY < 0

            // 如果水平不存在的话
            if (!this.hasHorizontalScroll) {
                this.maxScrollX = 0
                this.scrollerWidth = this.wrapperWidth
            }

            if (!this.hasVerticalScroll) {
                this.maxScrollY = 0
                this.scrollerHeight = this.wrapperHeight
            }

            this.endTime = 0
            // 移动方向
            this.directionX = 0
            this.directionY = 0
            // return el.offsetLeft
            // el.offsetLeft是距离父容器的距离
            // el.getBoundingClientRect()返回的是距离页面的距离
            this.wrapperOffset = offset(this.wrapper)

            // 切换到refresh事件
            this.trigger('refresh')

            // 重置位置
            this.resetPosition()
        }
当我们的dom结构发生变化的时候，我们就需要重新计算父容器和容器的大小了，这样就可以重新
渲染了，这个函数没什么太难理解的部分，需要注意的是getBoundingClientRect()方法返回元素
的大小及其相对于视口的位置。他同element.style获取的有些区别，getBoundingClientRect()
获取到的值是相对视口左上角，意思是说在获取right值的时候，事实上是left+element.clientWidth
。而且getBoundingClientRect()是只能读取，而element.style不仅能读取，还能获取。el.offsetLeft
返回的距离父容器的距离，如果我们需要得到元素距离document的距离的话我们就需要这样写

export function offset(el) {
    let left = 0
    let top = 0

    while (el) {
        left -= el.offsetLeft
        top -= el.offsetTop
        el = el.offsetParent
    }

    return {
        left,
        top
    }
}
一直找到没有父元素的时候，就找到元素距离document的距离了
3、trigger函数
在better-scroll的源码中，多次用到trigger函数，我们来看看他都做了什么
     BScroll.prototype.trigger = function (type) {
            let events = this._events[type]
            if (!events) {
                return
            }

            let len = events.length
            let eventsCopy = [...events]
            for (let i = 0; i < len; i++) {
                let event = eventsCopy[i]
                let [fn, context] = event
                if (fn) {
                    fn.apply(context, [].slice.call(arguments,1))
                }
            }
      }
trigger函数的作用就是切换到某个事件中，获取到事件，然后使用fn进行调用。没什么太大难度，
这里想到一点能够体现es6的优越性的地方，比如a = [1,2,3] 在es5中如果我们需要获取a这个数组
长度的时候，我们需要这样写
    let len = a.length
但是在es6中我们不再需要这样写了，这样写就行
    let { length } = a
如果需要获取其他属性值，就麻瓜式往里边填。这里还涉及一个深拷贝的问题，数组和对象的深拷贝
我认为最重要的就是这三个函数

总结：
    这个better-scroll的源码条理清晰，毕竟滴滴D8的段位摆在那儿，知道在干什么，还有一点就
是在写这个源码分析的文章的时候，我意识到一个问题，那就是不仅我自己能够看懂，以前我也写过
vuex的源码分析，基本就是把代码全部贴上去，写了大概2万字，我现在觉得这种方法欠妥，正确的
方式应该就是把重要的部分提取出来，最重要的引导一个思路。把代码整个贴出来，显得繁琐不说，
又相当于读者自己把注释看了一遍而已，所以我认为正确的方式是弄出一个思路，读者尝试读源码的
时候，能够有一个大概的概念
    至于为什么这个标题不写better-scroll的源码分析呢，我怕有些人说有些源码分析的文章就是垃
圾，所以至少在字面上进行改变(逃。。。)


