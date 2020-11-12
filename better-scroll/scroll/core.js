// maxScrollX是表示横向滚动的最大距离是负值
import {
    eventType,
    TOUCH_EVENT,
    preventDefaultException,
    tap,
    click,
    style,
    offset
} from '../util/dom'
import { ease } from '../util/ease'
// return {destination, duration}
import { momentum } from '../util/momentum'
import { requestAnimationFrame, cancelAnimationFrame } from '../util/raf'
import { getNow } from '../util/lang'
import { DIRECTION_DOWN, DIRECTION_UP, DIRECTION_LEFT, DIRECTION_RIGHT } from '../util/const'

export function coreMixin(BScroll) {
    BScroll.prototype._start = function (e) {
        // _eventType事件类型
        let _eventType = eventType[e.type]
        // _eventType表示不是触摸事件
        if (_eventType !== TOUCH_EVENT) {
            // e.button 返回的是鼠标按键的类型
            // 如果是左键就返回0,中间就返回1，右边返回2
            if (e.button !== 0) {
                return
            }
        }
        // 如果没有初始化，或者balabala
        if (!this.enabled || this.distoryed || (this.initiated && this.initiated !== _eventType)) {
            return
        }
        // this.initiated值等于事件类型
        this.initiated = _eventType

        // preventDefault是为了阻止默认行为
        // preventDefault是会阻止所有的默认行为，preventDefaultException是为了
        // 不阻止某些标签的默认行为
        if (this.options.preventDefault && !preventDefaultException(e.target, this.options.preventDefaultException)) {
            e.preventDefault()
        }

        this.moved = false
        this.distX = 0
        this.distY = 0
        // directionX: 判断 scroll 滑动结束后相对于开始滑动位置的方向
        this.directionX = 0
        this.directionY = 0
        // movingDirectionX表示滑动过程中的方向
        this.movingDirectionX = 0
        this.movingDirectionY = 0
        this.directionLocked = 0

        // 定义动画时长
        this._transitionTime()
        // 动画开始时间
        this.startTime = getNow()

        if (this.options.wheel) {
            this.target = e.target
        }

        // 关闭没进行完的动画
        this.stop()

        // e.touches[0]表示第一个手指
        let point = e.touches ? e.touches[0] : e

        this.startX = this.x
        this.startY = this.y
        this.absStartX = this.x
        this.absStartY = this.y
        // 保存起始位置
        this.pointX = point.pageX
        this.pointY = point.pageY

        this.trigger('beforeScrollStart')
    };

    BScroll.prototype._move = function (e) {
        if (!this.enabled || this.distoryed || eventType[e.type] !== this.initiated) {
            return
        }

        if (this.options.preventDefault) {
            e.preventDefault()
        }

        let point = e.touches ? e.touches[0] : e
        let deltaX = point.pageX - this.pointX
        let deltaY = point.pageY - this.pointY

        this.pointX = point.pageX
        this.pointY = point.pageY

        this.distX += deltaX
        this.distY += deltaY

        let absDistX = Math.abs(this.distX)
        let absDistY = Math.abs(this.distY)

        let timestamp = getNow()

        if (timestamp - this.endTime > this.options.momentumLimitTime
            && (absDistY < this.options.momentumLimitDistance
                && absDistX < this.options.momentumLimitDistance)) {
            return
        }


        // 如果滚动一个方向，锁住其他方向
        if (!this.directionLocked && !this.options.freeScroll) {
            if (absDistX > absDistY + this.options.directionLockThreshold) {
                this.directionLocked = 'h' // lock horizontally
            } else if (absDistY >= absDistX + this.options.directionLockThreshold) {
                this.directionLocked = 'v'  // local vertically
            } else {
                this.directionLocked = 'n' // no lock
            }
        }
    };

    BScroll.prototype._end = function (e) {
        // this.enabled判断scroller 是否处于启用状态
        if (!this.enabled || this.destoryed || eventType[e.type] !== this.initiated) {
            return
        }
        this.initiated = false

        if (this.options.preventDefault &&
             !preventDefaultException(e.target, this.options.preventDefaultException)) {
            e.preventDefault()
        }

        this.trigger('touchEnd', {
            x: this.x,
            y: this.y
        })

        let preventClick = this.stopFromTranstion
        this.stopFromTranstion = false

        // 下拉刷新
        if (this.options.pullDownRefresh && this._checkPullDown()) {
            return
        }

        // rest if we are outside of the boundaries
        if (this.resetPosition(this.options.bounceTime, ease.bounce)) {
            return
        }
        this.isInTransition = false
        // 确保最后的位置是最靠近的
        let newX = Math.round(this.x)
        let newY = Math.round(this.y)

        if (!this.moved) {
            if (this.options.wheel) {
                if (this.target && this.target.className === this.options.wheel.wheelWrapperClass) {
                    let index = Math.abs(Math.round(newY / this.itemHeight))
                    let _offset = Math.round((this.pointY + offset(this.target).top - this.itemHeight / 2) / this.itemHeight)
                    this.target = this.items[index + _offset]
                }
                this.scrollToElement(this.target, this.options.wheel.adjustTime || 400, true, true, ease.swipe)
            } else {
                // preventClick = false
                if (!preventClick) {
                    // tap被点击的区域派发点击tap事件
                    if (this.options.tap) {
                        tap(e, this.options.tap)
                    }
                    // 点击派发click事件，并且给Event加一个属性_constructed,为true
                    if (this.options.click) {
                        click(e)
                    }
                }
            }
            this.trigger('scrollCancel')
            return
        }

        this.scrollTo(newX, newY)

        let deltaX = newX - this.absStartX
        let deltaY = newY - this.absStartY
        this.directionX = deltaX > 0 ? DIRECTION_RIGHT
         : deltaX < 0 ? DIRECTION_LEFT : 0
        this.directionY = deltaY > 0 ? DIRECTION_DOWN
        : deltaY < 0 ? DIRECTION_UP : 0

        this.endTime = getNow()

        let duration = this.endTime - this.startTime
        let absDistX = Math.abs(newX - this.startX)
        let absDistY = Math.abs(newY - this.startY)


        // flick 轻拂时
        if (this._events.flick && duration < this.options.flickLimitTime
            && absDistX < this.options.flickLimitDistance
            && absDistY < this.options.flickLimitDistance) {
            this.trigger('flick')
            return
        }

        let time = 0
        // 开始momentum 动画
        if (this.options.momentum && duration < this.options.momentum
            && (absDistY > this.options.momentumLimitDistance
                 || absDistX > this.options.momentumLimitDistance)) {
                     // bounce: 当滚动超过边缘的时候会有一小段回弹动画。设置为 true 则开启动画
                     // momentum return {destination, duration}
            let momentumX = this.hasHorizontalScroll
                            ? momentum(this.x, this.startX, duration, this.maxScrollX,
                                 this.options.bounce ? this.wrapperWidth : 0, this.options)
                            : {destination: newX, duration: 0}
            let momentumY = this.hasVerticalScroll
                            ? momentum(this.y, this.startY, duration, this.maxScrollY,
                                 this.options.bounce ? this.wrapperHeight : 0, this.options)
                            : {destination: newY, duration: 0}
            newX = momentumX.destination
            newY = momentumY.destination
            time = Math.max(momentumX.duration, momentumY.duration)
            this.isInTransition = true
        } else {
            if (this.options.wheel) {
                newY = Math.round(newY / this.itemHeight) * this.itemHeight
                time = this.options.wheel.adjustTime || 400
            }
        }

        let easing = ease.swipe
        if (this.options.snap) {
            let snap = this._nearstSnap(newX, newY)
            this.currentPage = snap
            time = this.options.snapSpeed || Math.max(
                Math.max(
                    Math.min(Math.abs(newX - snap.x), 1000),
                    Math.min(Math.abs(newY - snap.y), 1000)
            ), 300)
            newX = snap.x
            newY = snap.y

            this.directionX = 0
            this.directionY = 0
            easing = ease.bounce
        }

        if (newX !== this.x || newY !== this.y) {
            // 改变easing方法，当scroller超出边界的时候
            if (newX > 0 || newX < this.maxScrollX
                || newY > 0 || newY < this.maxScrollY) {
                easing = ease.swipeBounceTime
            }
            this.scrollTo(newX, newY, time, easing)
            return
        }

        if (this.options.wheel) {
            this.selectedIndex = Math.round(Math.abs(this.y / this.itemHeight))
        }
        this.trigger('scrollEnd', {
            x: this.x,
            y: this.y
        })
    }

    BScroll.prototype._resize = function () {
        if (!this.enabled) {
            return
        }

        clearTimeout(this.resizeTimeout)
        // this.options.resizePolling表示延时多少秒后进行refresh
        this.resizeTimeout = setTimeout(() => {
            this.refresh()
        }, this.options.resizePolling)
    };

    BScroll.prototype._startProbe = function () {
        cancelAnimationFrame(this.probeTimer)
        this.probeTimer = requestAnimationFrame(probe)

        let me = this

        function probe() {
            if (!me.isInTransition) {
                return
            }
            // getComputedPosition返回的transform的属性值
            let pos = me.getComputedPosition()
            // 派发scroll事件，并且将Pos参数传入进去
            me.trigger('scroll', pos)
            me.probeTimer = requestAnimationFrame(probe)
        }
    };

    BScroll.prototype._transitionTime = function (time = 0) {
        // transitionTime表示动画持续时间
        this.scrollerStyle[style.transitionDuration] = time + 'ms'

        if (this.options.wheel) {
            for (let i = 0; i < this.items.length; i++) {
                this.items[i].style[style.transitionDuration] = time + 'ms'
            }
        }

        // indicators是干嘛的
        if (this.indicators) {
            for (let i = 0; i < this.indicators.length; i++) {
                this.indicators[i].transitionTime(time)
            }
        }
    };

    BScroll.prototype._transitionProperty = function (property = 'transform') {
        // style.transitionProperty 返回的是加了前缀的transitionProperty
        this.scrollerStyle[style.transitionProperty] = property
    }

    BScroll.prototype._transitionTimingFunction = function (easing) {
        this.scrollerStyle[style.transitionTimingFunction] = easing

        // 这个暂时不用管
        if (this.options.wheel) {
            for (let i = 0; i < this.items.length; i++) {
                this.items[i].style[style.transitionTimingFunction] = easing
            }
        }

        if (this.indicators) {
            for (var i = 0; i < this.indicators.length; i++) {
                this.indicators[i].transitionTimingFunction(easing)
            }
        }
    };

    BScroll.prototype._transitionEnd = function (e) {
        if (e.target !== this.scroller || !this.isInTransition) {
            return
        }

        // 设置transform时间
        this._transitionTime()
        if (!this.pulling && !this.resetPosition(this.options.bounceTime, ease.bounceTime)) {
            this.isInTransition = false
            this.trigger('scrollEnd', {
                x: this.x,
                y: this.y
            })
        }
    };

    BScroll.prototype._translate = function (x, y) {
        if (this.options.useTransform) {
            // this.translateZ是从硬件加速那儿来的
            this.scrollerStyle[style.transform] = `translate(${x}px,${y}px)${this.translateZ}`
        } else {
            x = Math.round(x)
            y = Math.round(y)
            this.scrollerStyle.left = `${x}px`
            this.scrollerStyle.top = `${y}px`
        }

        if (this.options.wheel) {
            const {rotate = 25} = this.options.wheel
            for (let i = 0; i < this.items.length; i++) {
                let deg = rotate * (y / this.itemHeight + i)
                this.items[i].style[style.transform] = `rotateX(${deg}deg)`
            }
        }

        // 这里设置了this.x, this.y
        this.x = x
        this.y = y

        if (this.indicators) {
            for (let i = 0; i < this.indicators.length; i++) {
                this.indicators[i].updatePosition()
            }
        }
    }

    BScroll.prototype._animate = function (destX, destY, duration, easingFn) {
        let me = this
        let startX = this.x
        let startY = this.y
        let startTime = getNow()
        let destTime = startTime + duration

        function step() {
            let now = getNow()

            // 表示是否还在运动,now >= destTime 表示运动结束
            if (now >= destTime) {
                me.isAnimating = false
                me._translate(destX, destY)

                // 这里表示没有恢复到原位置，me.pulling这里表示
                if (!me.pulling && !me.resetPosition(me.options.bounceTime)) {
                    me.trigger('scrollEnd', {
                        x: me.x,
                        y: me.y
                    })
                }
                return
            }

            // duration是动画持续时间
            now = (now - startTime) / duration
            let easing = easingFn(now)
            let newX = (destX - startX) * easing + startX
            let newY = (destY - startY) * easing + startY

            me._translate(newX, newY)

            if (me.isAnimating) {
                me.animateTimer = requestAnimationFrame(step)
            }

            if (me.options.probeType === 3) {
                me.trigger('scroll', {
                    x: me.x,
                    y: me.y
                })
            }
        }

        this.isAnimating = true
        cancelAnimationFrame(this.animateTimer)
        step()
    };

    BScroll.prototype.scrollBy = function (x, y, time = 0, easing = ease.bounce) {
        x = this.x + x
        y = this.y + y

        this.scrollTo(x, y, time, easing)
    }

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
                this._animate(x, y, time, easing.fn)
            }
        }
    };

    // 滚动到指定的元素
    BScroll.prototype.scrollToElement = function (el, time, offsetX, offsetY, easing) {
        if (!el) {
            return
        }
        el = el.nodeType ? el : this.scroller.querySelector(el)

        if (this.options.wheel && el.className !== this.options.wheel.wheelItemClass) {
            return
        }


        let pos = offset(el)
        // this.wrapperOffset = offset(this.wrapper)
        // 目标元素距离元素的距离,pos.left表示一个负值
        pos.left -= this.wrapperOffset.left
        pos.top -= this.wrapperOffset.top

        //  offsetX 相对于目标元素的横轴偏移量，设置为true
        // 就滚动到目标元素的中心位置
        if (offsetX === true) {
            offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2)
        }
        if (offsetY === true) {
            offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2)
        }

        // 这里可以理解
        pos.left -= offsetX || 0
        pos.top -= offsetY || 0
        pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX
         ? this.maxScrollX : pos.left
        pos.top = pos.top > 0 ? 0 : pos.top < this.maxScrollY
         ? this.maxScrollX : pos.top

         if (this.options.wheel) {
             pos.top = Math.round(pos.top / this.itemHeight) * this.itemHeight
        }

        this.scrollTo(pos.left, pos.top, time, easing)
    };

    BScroll.prototype.resetPosition = function (time = 0, easing = ease.bounce) {
        let x = this.x
        // 水平不能移动，或者x > 0
        if (!this.hasHorizontalScroll || x > 0) {
            x = 0
            // 获取 x 超出了最大滑动距离
        } else if (x < this.maxScrollX) {
            x = this.maxScrollX
        }

        let y = this.y
        if (!this.hasVerticalScroll || y > 0) {
            y = 0
        } else if (y < this.maxScrollY) {
            y = this.maxScrollY
        }

        // easing表示滑动方式
        this.scrollTo(x, y, time, easing)

        return true
    };

    BScroll.prototype.getComputedPosition = function () {
        // 获取最终在元素上显示的样式，
        // 和el.style不同的是，getComputedStyle只能获取不能设置，并且
        // el.style是只能获取style里边的属性
        let matrix = window.getComputedStyle(this.scroller, null)
        let x
        let y

        // 如果支持使用transform
        if (this.options.useTransform) {
            matrix = matrix[style.transform].split(')')[0].split(', ')
            x = +(matrix[12] || matrix[4])
            y = +(matrix[13] || matrix[5])
        } else {
            x = +matrix.left.replace(/[^-\d.]/g, '')
            y = +matrix.top.replace(/[^-\d.]/g, '')
        }

        return {
            x,
            y
        }
    };

    BScroll.prototype.stop = function () {
        // useTransition表示使用css3的transition
        //  isInTransition表示正处在动画过程中
        if (this.options.useTransition && this.isInTransition) {
            this.isInTransition = false
            // getComputedPosition返回的是transform的属性值
            let pos = this.getComputedPosition()
            this._translate(pos.x, pos.y)
            if (this.options.wheel) {
                this.target = this.items[Math.round(-pos.y / this.x)]
            } else {
                this.trigger('scrollEnd', {
                    x: this.x,
                    y: this.y
                })
            }
            this.stopFromTranstion = true
            // 使用的不是css3的transition isAnimating是用js判断是否在滚动过程中
        } else if (!this.options.useTransition && this.isAnimating) {
            this.isAnimating = false
            this.trigger('scrollEnd', {
                x: this.x,
                y: this.y
            })
            this.stopFromTranstion = true
        }
    };

    BScroll.prototype.destroy = function () {
        this._removeDOMEvents()
        // remove custom events
        this._events = {}

        if (this.options.scrollbar) {
            this._removeScrollBars()
        }

        this.destroyed = true
        this.trigger('destory')
    };
}
