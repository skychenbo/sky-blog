结合例子有以下情况
```html
<keep-alive>
    <coma v-if="visible"></coma>
    <comb v-else></comb>
</keep-alive>
<button @click="visible = !visible">更改</button>
```
例如在`coma`和`comb`都有一个`input`都有对应的`value`，如果我们不用`keep-alive`，当更改`visible`的时候，这两个组件都会重新渲染，先前输入的内容就会丢失，会执行一遍完整的生命周期流程:`beforeCreate` => `created`...。  
但是如果我们用了`keep-alive`，那么在次切换`visible`的时候，`input`对应的`value`为上次更改时候的值。
所以`keep-alive`主要是用于保持组件的状态，避免组件反复创建。
## 原理
`keep-alive`的使用方法定在`core/components/keep-alive`中
```js
export default {
    abstract: true,
    props: {
        include: patternTypes, // 缓存白名单
        exclude: patternTypes,  // 缓存黑名单
        max: [String, Number] // 缓存的实例上限
    },
    created() {
        // 用于缓存虚拟DOM
        this.cache = Object.create(null);
        this.keys = [];
    },
    mounted() {
    // 用于监听i黑白名单，如果发生调用pruneCache
    // pruneCache更新vue的cache缓存
        this.$watch('include', val => {
            pruneCache(this, name => matches(val, name))
        })
        this.$watch('exclude', val => {
            pruneCache(this, name => !matches(val, name))
        })
    }
    render() {
        //...
    }
}
```
上面代码中定义了多个声明周期的操作，最重要的`render`函数，下面来看看是如何实现的
## `render`
```js
render () {
    const slot = this.$slots.default
    const vnode: VNode = getFirstComponentChild(slot) // 找到第一个子组件对象
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) { // 存在组件参数
      // check pattern
      const name: ?string = getComponentName(componentOptions) // 组件名
      const { include, exclude } = this
      if ( // 条件匹配
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      const { cache, keys } = this
      const key: ?string = vnode.key == null // 定义组件的缓存key
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
      if (cache[key]) { // 已经缓存过该组件
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
        remove(keys, key)
        keys.push(key) // 调整key排序
      } else {
        cache[key] = vnode // 缓存组件对象
        keys.push(key)
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) { // 超过缓存数限制，将第一个删除
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }

      vnode.data.keepAlive = true // 渲染和执行被包裹组件的钩子函数需要用到
    }
    return vnode || (slot && slot[0])
  }
```
进行分步骤进行分析
1. 获取`keep-alive`对象包括的第一个子组件对象
2. 根据白黑名单是否匹配返回本身的`vnode`
3. 根据`vnode`的`cid`和`tag`生成的`key`，在缓存对象中是否有当前缓存，如果有则返回，并更新`key`在`keys`中的位置
4. 如果当前缓存对象不存在缓存，就往`cache`添加这个的内容，并且根据`LRU`算法删除最近没有使用的实例
5. 设置为第一个子组件对象的`keep-alive`为`true`  

## 首次渲染
结合文章开头的文章进行分析当前例子，当页面首次渲染的时候，因为组件的渲染过程是先子组件后父组件的，所以这里就能拿到子组件的数据，然后把子组件的`vnode`信息存储到`cache`中，并且把`coma`组件的`keepAlive`的置为`true`。
这个有个疑问，为什么能拿到子组件的`componentOptions`，借助上面个例子，我们知道生成`vnode`是通过`render`函数，`render`函数是通过在`platforms/web/entry-runtime-with-compiler`中定义，通过`compileToFunctions`将`template`编译为`render`函数，看一下生成的对应`render`函数
```html
<template>
    <div class="parent">
        <keep-alive>
            <coma v-if="visible"></coma>
        <comb v-else></comb>
        </keep-alive>
    </div>
</template>
<script>
(function anonymous() {
  with(this) {
    return _c('div', {
      staticClass: "parent"
    }, [
      _c('keep-alive', [(visibility) ? _c('coma') : _c('comb')], 1), 
      _c('button', {
      on: {
        "click": change
      }
    }, [_v("change")])], 1)
  }
})
</script>
```
可以看到生成的`render`函数中有关`keep-alive`的生成过程
```js
 _c('keep-alive', [(visibility) ? _c('coma') : _c('comb')], 1),
```
在`keep-alive`中先调用了`_c('coma')`，所以才能访问到到子组件的`componentOptions`，具体的`_c`是在`vdom/create-element.js`中定义，他判断是生成组件`vnode`还是其他的。
## 更改`data`，触发`patch`
在首次渲染的时候，我们更改`coma`中的`input`的值，看当`visible`再次更改为`true`的时候，`input`是否会记住先前的值。因为更改了`visible`的值后，会重新执行这段代码
```js
updateComponent = () => {
    vm._update(vm._render())
}
```
所以就会重新执行`keep-alive`的`render`函数，因为在首次渲染的时候已经把数据存入到`cache`中，所以这次数据直接从`cache`中获取执行。
```js
vnode.componentInstance = cache[key].componentInstance
```
在首次渲染的时候提到当`key`值不存在的时候会先将子组件的`vnode`缓存起来，如果通过打断点的方式可以看到首次渲染的时候`componentInstance`为`undefined`，`componentInstance`实际是在`patch`过程中调用组件的`init`钩子才生成的，那么为什么这个时候能拿到呢，这里通过一个例子来进行讲解例如有下面例子
```js
a = {
    b: 1
}
c = a;
a.b = 5;
console.log(c.b) // 5
```
`object`是引用类型，所以原对象发生更改的时候引用的地方也会发生改变  
那么就把先前的状态信息重新赋值给了`coma`，然后为什么赋值给了`coma`，`coma`的就不会执行组件的创建过程呢，看`patch`的代码，当执行到`createComponent`的时候，因为`coma`为组件，就会执行组件相关的逻辑
```js
// core/vdom/patch.js
function createComponent(vnode, insertedVnodeQueue, parentElm, refELm) {
    let i = vnode.data;
    if (isDef(i)) {
        const isReactivated = isDef(vnode.componentInstance) && i.keepAlive;
        if (isDef(i = i.hook) && isDef(i = i.init)) {
            i(vnode, false);
        }
    }
}
// core/vdom/create-component
init(vnode) {
    if (vnode.componentInstance && 
        !vnode.componentInstance._isDetroyed &&
        vnode.data.keepAlive) {
            const mountedNode: any = node;
            componentVnodeHooks.prepatch(mountedNode, mountedNode)
    } else {
        const child = vnode.componentInstance = createComponentInstanceForVnode(
            vnode,
            activeInstance
        )
        child.$mount(vnode.elm)
    }
}
```
因为`vnode.componentInstance`在`keep-alive`已经进行了重新赋值，所以并且`keepAlive`为`true`，所以只会执行`prepatch`，所以`created`、`mounted`钩子都不会执行。
## `keep-alive`本身创建和`patch`过程
在`core/instance/render`中，可以看到`updateComponent`的定义
```js
updateComponent = () => {
    vm._update(vm._render())
}
```
所以首先调用`keep-alive`的`render`函数生成`vnode`，然后调用`vm._update`执行`patch`操作，那么`keep-alive`和普通组件在首次创建的时候和`patch`过程中有什么差异呢?
### 首次渲染
不管`keep-alive`是不是抽象组件，他终究是个也是个组件，所以也会执行组件相应的逻辑，在首次渲染的时候执行`patch`操作，执行到`core/vdom/patch`中
```js
function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data
    if (isDef(i)) {
         const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
        if (isDef(i = i.hook) && isDef(i = i.init)) {
            i(vnode, false /* hydrating */)
        }
    }
}
```
因为是首次渲染所以`componentInstance`并不存在，所以只执行了`init`钩子，`init`的具体作用就是创建子组件实例。  
但`keep-alive`毕竟是抽象组件，那抽象组件和正常组件区别体现在哪儿呢？
在`core/instance/lifecycle`中可以看到，不是抽象组件的时候才会往父组件中加入本身,，并且子组件也不会往抽象组件`$children`中加入自己。这个函数又是在`vm._init`中进行调用的
```
let parent = options.parent
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    parent.$children.push(vm)
  }
```
### 更改数据后`patch`过程
结合上面的例子，当`visible`发生更改的时候，会影响到`keep-alive`组件吗，在`patch`的那片文章提到过当`data`中的值发生改变的时候，会触发`updateComponent`
```js
updateComponent = () => {
    vm._update(vm._render())
}
```
就会重新执行`keep-alive`的`render`函数，重新执行根组件的`patch`过程，具体的原理课参照[Vue 源码patch过程详解](https://juejin.im/post/5ddb91e451882572fe6edf69)，这里就直接执行了`keep-alive`组件的`prepatch`钩子
### 待解决
这里有个问题需要解决一下，每次到达下一个`tick`的时候都需要进行重新生成`vnode`，这里有什么办法优化吗，能不能用其他方式来替换，还是说必须这么做？小伙伴能想到什么好的办法吗？

## `keep-alive`是否是必须的
可以看到`keep-alive`对于缓存数据是有巨大帮助的，并且可以防止组件反复创建。那么就有问题了，是否绝大多数组件都可以使用`keep-alive`用于提高性能。  
1. 什么场景使用  
在页面中，我们如果返回上一个页面是会刷新数据的，如果我们需要保留离开页面时候的状态，那么就需要使用`keep-alive`
2. 什么场景不使用  
先思考使用`keep-alive`是否有必要，如果两个组件切换是不需要保存状态的，那还需要吗。你可能说用`keep-alive`能节省性能，那我们在需要在`activated`重置这些属性。这样做有几点风险
    1. 你能确定把所有的变量都进行了重置了吗，这个风险是可控的吗
    2. 所有的缓存都放在了`cache`中，当组件过多的时候内容过多，就导致这个对象巨大，还能起到提高性能的需求吗，这个表示怀疑态度

`Vue`的源码分析的文章会一直更新，麻烦关注一下我的[github](https://github.com/skychenbo/Blog)
