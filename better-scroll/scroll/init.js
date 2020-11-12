import {
    hasPerspective,
    hasTransition,
    hasTransform,
    hasTouch,
    style,
    offset,
    addEvent,
    removeEvent,
    getRect,
    preventDefaultException
} from '../util/dom'

import {extend} from '../util/lang'


const DEFAULT_OPTIONS = {
    startX: 0,
    startY: 0,
    scrollX: false,
    scrollY: true,
    // 支持同时横向竖向同时滚动
    freeScroll: false,
    // 通过比例判断滚动方向
    directionLockThreshold: 5,
    // 保留原生滚动
    eventPassthrough: '',
    click: false,
    // 区域被点击时，派发一个tap事件
    tap: false,
    // 回弹效果
    bounce: true,
    bounceTime: 700,
    // 根据距离和时间生成滚动动画
    momentum: true,
    momentumLimitTime: 300,
    momentumLimitDistance: 15,
    // 设置momentum的动画时长
    swipeTime: 2500,
    swipeBounceTime: 500,
    deceleration: 0.001,
    flickLimitTime: 200,
    // 只有用户在屏幕上滑动的距离小于 flickLimitDistance
    // 才算一次轻浮
    flickLimitDistance: 100,
    // 尺寸发生变化，
    resizePolling: 60,
    // 0不派发事件，1在滑动超过一定时间派发事件，
    // 2在滚动的时候派发事件, 3是滑动和momentum都派发事件
    probeType: 0,
    // 是否阻止浏览器默认事件
    preventDefault: true,
    // 表示这些的默认行为不会被阻止
    preventDefaultException: {
        tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/
    },
    // 硬件加速效果
    HWCompositing: true,
    // 是否使用transition做动画效果
    useTransition: true,
    useTransform: true,
    // 滚动一般绑定在document上，如果设置为ture,
    // 则绑定在目标容器上
    bindToWrapper: false,
    // 不建议修改
    disableMouse: hasTouch,
    disabelTouch: !hasTouch,
    /**
     * for picker
     * wheel: {
          *   selectedIndex: 0,
          *   rotate: 25,
          *   adjustTime: 400
          *   wheelWrapperClass: 'wheel-scroll',
          *   wheelItemClass: 'wheel-item'
          * }
     */
    wheel: false,
    /**
     * for slide
     * snap: {
          *   loop: false,
          *   el: domEl,
          *   threshold: 0.1,
          *   stepX: 100,
          *   stepY: 100,
          *   listenFlick: true
          * }
     */
    snap: false,
    /**
     * for scrollbar
     * scrollbar: {
          *   fade: true
          * }
     */
    scrollbar: false,
    /**
     * for pull down and refresh
     * pullDownRefresh: {
         *   threshold: 50,
         *   stop: 20
         * }
     */
    pullDownRefresh: false,
    /**
     * for pull up and load
     * pullUpLoad: {
         *   threshold: 50
         * }
     */
    pullUpLoad: false
}

export function initMixin(BScroll) {
    BScroll.prototype._init = function (el, options) {
        this._handleOptions(options)

        // init private custom events
        this._events = {}

        this.x = 0
        this.y = 0
        this.directionX = 0
        this.directionY = 0

        this._addDOMEvents()

        this._initExtFeatures()

        this._watchTrasition()

        this.refresh()

        // snap为slider组件而做，如果snap不存在
        if (!this.options.snap) {
            this.scrollTo(this.options.startX, this.options.startY)
        }

        // this.enable()开始better-scroll
        this.enable()
    }

    BScroll.prototype._handleOptions = function (options) {
        this.options = extend({}, DEFAULT_OPTIONS, options)

        // HWCompositing用于是否硬件加速
        this.translateZ = this.options.HWCompositing && hasPerspective ? 'translateZ(0)' : ''

        this.options.useTransition = this.options.useTransition && hasPerspective
        this.options.useTransform = this.options.useTransform && hasTransform

        // eventPassthrough用于是否阻止默认行为
        this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault

        this.options.scrollX = this.options.eventPassthrough === 'horizontal' ? false : this.options.scrollX
        this.options.scrollY = this.options.eventPassthrough === 'vertical' ? false : this.options.scrollY

        this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough
        this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold

        // 用于派发tap事件
        if (this.options.tap === true) {
            this.options.tap = 'tap'
        }
    }

    BScroll.prototype._addDOMEvents = function () {
        // function addEvent(){el, type, fn, capture}{
        //    el.addEventListener(type, fn, {passive: false, capture: !!capture})
        // }
        let eventOperation = addEvent
        this._handleDOMEvents(eventOperation)
    }

    BScroll.prototype._removeDOMEvents = function () {
        // function addEvent(){el, type, fn, capture}{
        //    el.removeEventListener(type, fn, {passive: false, capture: !!capture})
        // }
        let eventOperation = removeEvent
        this._handleDOMEvents(eventOperation)
    }

    BScroll.prototype._handleDOMEvents = function (eventOperation) {
        // bindToWrapper用于绑定滚动容器
        let target = this.options.bindToWrapper ? this.wrapper : window
        eventOperation(window, 'orientationchange', this)
        eventOperation(window, 'resize', this)

        if (this.options.click) {
            // 这里的this指向的是function BScroll() {....}这个函数，意思是说
            // el.removeEventListener(type,function BScroll{}...)
            eventOperation(this.wrapper, 'click', this, true)
        }

        // 如果是在pc端disableMouse为false,会监听鼠标事件
        // 如果是在移动端disableMouse为True，不会监听事件
        if (!this.options.disableMouse) {
            eventOperation(this.wrapper, 'touchstart', this)
            eventOperation(target, 'touchmove', this)
            eventOperation(target, 'touchcancel', this)
            eventOperation(target, 'touchend', this)
        }

        // 用于检测touch事件，移动端diableTouch为false
        if (hasTouch && !this.options.disableTouch) {
            eventOperation(this.wrapper, 'touchstart', this)
            eventOperation(target, 'touchmove', this)
            eventOperation(target, 'touchcancel', this)
            eventOperation(target, 'touchend', this)
        }

        eventOperation(this.scroller, style.transitionEnd, this)
    }

    BScroll.prototype._initExtFeatures = function () {
        if (this.options.snap) {
            this._initSnap()
        }
        if (this.options.scrollbar) {
            this._initScrollbar()
        }
        if (this.options.pullUpLoad) {
            this._initPullUp()
        }
        if (this.options.pullDownRefresh) {
            this._initPullDown()
        }
        if (this.options.wheel) {
            this._initWheel()
        }
    }

    BScroll.prototype.handleEvent = function (e) {
        switch (e.type) {
            case 'touchstart':
            case 'mousedown':
                this._start(e)
                break
            case 'touchmove':
            case 'mousemove':
                this._move(e)
                break
            case 'touchend':
            case 'mouseup':
            case 'touchcancel':
            case 'mousecancel':
                this._end(e)
                break
            case 'orientationchange':
            case 'resize':
                this._resize()
                break
            case 'transitionend':
            case 'webkitTransitionEnd':
            case 'oTransitionEnd':
            case 'MSTransitionEnd':
                this._transitionEnd(e)
                break
            case 'click':
                // e._constructed这个是click事件发生的时候会派发一个click事件，然后
                // e._constructed设置为true
                // 这里就表示没有派发click事件
                if (this.enabled && !e._constructed) {
                    if (!preventDefaultException(e.target, this.options.preventDefaultException)) {
                        e.preventDefault()
                    }
                    e.stopPropagation()
                }
                break
        }
    }

    // DOM结构发生变化的时候需要调用重新计算位置，距离等
    BScroll.prototype.refresh = function () {
        // return getBoundingRect
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
        this.directionX = 0
        this.directionY = 0
        // return el.offsetLeft
        // el.offsetLeft是距离父容器的距离
        // el.getBoundingClientRect()返回的是距离页面的距离
        this.wrapperOffset = offset(this.wrapper)

        // 切换到refresh事件
        this.trigger('refresh')

        this.resetPosition()
    }

    BScroll.prototype.enable = function () {
        this.enabled = true
    }

    BScroll.prototype.disableMouse = function () {
        this.enabled = false
    }

    BScroll.prototype._watchTransition = function () {
        let isInTransition = false
        let me = this
        // pointerEvents用于指定某个特定元素成为鼠标事件的'auto'
        let prePointerEvents = this.scroller.style.pointerEvents || 'auto'
        Object.defineProperty(this, 'isInTransition', {
            get() {
                return isInTransition
            },
            set(newVal) {
                isInTransition = newVal
                if (isInTransition) {
                    me.scoller.style.pointerEvents = 'none'
                } else {
                    me.scroller.style.pointerEvents = prePointerEvents
                }
            }
        })
    }
}
