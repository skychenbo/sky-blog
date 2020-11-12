在这篇文章[深入源码学习Vue响应式原理](https://juejin.im/post/5dc0ea64e51d455818621891)讲解了当数据更改时，`Vue`是如何通知依赖他的数据进行更新的，这篇文章讲得就是：视图知道了依赖的数据的更改，但是怎么更新视图的。
## Vnode Tree
在真实的`HTML`中有`DOM`树与之对应，在`Vue`中也有类似的`Vnode Tree`与之对应。
### 抽象`DOM`树
在`jquery`时代，实现一个功能，往往是直接对`DOM`进行操作来达到改变视图的目的。但是我们知道直接操作`DOM`往往会影响重绘和重排，这两个是最影响性能的两个元素。  
进入`Virtual DOM`时代以后，将真实的`DOM`树抽象成了由`js`对象构成的抽象树。`virtual DOM`就是对真实`DOM`的抽象，用属性来描述真实`DOM`的各种特性。当`virtual DOM`发生改变时，就去修改视图。在`Vue`中就是`Vnode Tree`的概念
### VNode
当修改某条数据的时候，这时候`js`会将整个`DOM Tree`进行替换，这种操作是相当消耗性能的。所以在`Vue`中引入了`Vnode`的概念：`Vnode`是对真实`DOM`节点的模拟，可以对`Vnode Tree`进行增加节点、删除节点和修改节点操作。这些过程都只需要操作`VNode Tree`，不需要操作真实的`DOM`，大大的提升了性能。修改之后使用`diff`算法计算出修改的最小单位，在将这些小单位的视图进行更新。  
```js
// core/vdom/vnode.js
class Vnode {
    constructor(tag, data, children, text, elm, context, componentOptions) {
        // ...
    }
}
```

![](https://user-gold-cdn.xitu.io/2019/11/19/16e825a19a6bd706?w=592&h=418&f=png&s=51441)
#### 生成`vnode`
生成`vnode`有两种情况:
1. 创建非组件节点的`vnode`
    - `tag`不存在，创建空节点、注释、文本节点
    - 使用`vue`内部列出的元素类型的`vnode`
    - 没有列出的创建元素类型的`vnode`

以`<p>123</p>`为例，会被生成两个`vnode`: 
  - `tag`为`p`，但是没有`text`值的节点  
  - 另一个是没有`tag`类型，但是有`text`值的节点

2. 创建组件节点的`VNode`
组件节点生成的`Vnode`，不会和`DOM Tree`的节点一一对应，只存在`VNode Tree`中
    ```js
    // core/vdom/create-component
    function createComponent() {
        // ...
        const vnode = new VNode(
            `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
            data, undefined, undefined, undefined, context,
            { Ctor, propsData, listeners, tag, children }
        )
    }
    ```
    这里创建一个组件占位`vnode`，也就不会有真实的`DOM`节点与之对应  

组件`vnode`的建立，结合下面例子进行讲解:
```html
<!--parent.vue-->
<div classs="parent">
    <child></child>
</div>
<!--child.vue-->
<template>
    <div class="child"></div>
</template>
```
真实渲染出来的`DOM Tree`是不会存在`child`这个标签的。`child.vue`是一个子组件，在`Vue`中会给这个组件创建一个占位的`vnode`，这个`vnode`在最终的`DOM Tree`不会与`DOM`节点一一对应，即只会出现`vnode Tree`中。
```js
/* core/vdom/create-component.js */
export function createComponent () {
    // ...
     const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children }
    )
}
```
那最后生成的`Vnode Tree`就大概如下:
```
vue-component-${cid}-parent
    vue-component-${cid}-child
        div.child
```
最后生成的`DOM`结构为:
```html
<div class="parent">
    <div class="child"></div>
</div>
```
在两个组件文件中打印自身，可以看出两者之间的关系
`chlid`实例对象
![](https://user-gold-cdn.xitu.io/2019/11/18/16e7c896fd85aa79?w=1161&h=585&f=png&s=96702)
`parent`实例对象
![](https://user-gold-cdn.xitu.io/2019/11/18/16e7c891dedf3e85?w=1174&h=630&f=png&s=99953)
可以看到以下关系：
1. 父`vnode`通过`children`指向子`vnode`
2. 子`vnode`通过`$parent`指向父`vnode`
3. 占位`vnode`为对象的`$vnode`
4. 渲染的`vnode`为对象的`_vnode`

## `patch`
在上一篇文章提到当创建`Vue`实例的时候，会执行以下代码:
```js
updateComponent = () => {
    const vnode = vm._render();
    vm._update(vnode)
}
vm._watcher = new Watcher(vm, updateComponent, noop)
```
当数据发生改变时会触发回调函数`updateComponent`进行模板数据更新，`updateComponent`实际上是对`__patch__`的封装。`patch`的本质是将新旧`vnode`进行比较，创建或者更新`DOM`节点/组件实例，如果是首次的话，那么就创建`DOM`或者组件实例。
```js
// core/vdom/patch.js
function createPatchFunction(backend) {
    const { modules, nodeOps } = backend;
    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = []
        for (j = 0; j < modules.length; ++j) {
          if (isDef(modules[j][hooks[i]])) {
            cbs[hooks[i]].push(modules[j][hooks[i]])
          }
        }
    }
    
    return function patch(oldVnode, vnode) {
        if (isUndef(oldVnode)) {
            let isInitialPatch = true
            createElm(vnode, insertedVnodeQueue, parentElm, refElm)
        } else {
            const isRealElement = isDef(oldVnode.nodeType)
            if (!isRealElement && sameVnode(oldVnode, vnode)) {
                patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
            } else {
                if (isRealElement) {
                    oldVnode = emptyNodeAt(oldVnode)
                }
                const oldElm = oldVnode.elm
                const parentElm = nodeOps.parentNode(oldElm)
                createElm(
                    vnode,
                    insertedVnodeQueue,
                    oldElm._leaveC ? null : parentELm,
                    nodeOps.nextSibling(oldElm)
                )
                
                if (isDef(vnode.parent)) {
                    let ancestor = vnode.parent;
                    while(ancestor) {
                        ancestor.elm = vnode.elm;
                        ancestor = ancestor.parent
                    }
                    if (isPatchable(vnode)) {
                        for (let i = 0; i < cbs.create.length; ++i) {
                            cbs.create[i](emptyNode, vnode.parent)
                        }
                    }
                }
                if (isDef(parentElm)) {
                    removeVnodes(parentElm, [oldVnode], 0, 0)
                } else if (isDef(oldVnode.tag)) {
                    invokeDestroyHook(oldVnode)
                }
            }
        }
        
        invokeInsertHook(vnode, insertedVnodeQueue)
        return vode.elm
    }
}
```
- 如果是首次`patch`，就创建一个新的节点
- 老节点存在
    - 老节点不是真实`DOM`并且和新节点相同
        - 调用`patchVnode`修改现有节点
    - 新老节点不相同
        - 如果老节点是真实`DOM`，创建真实的`DOM`
        - 为新的`Vnode`创建元素/组件实例，若`parentElm`存在，则插入到父元素上
        - 如果组件根节点被替换，遍历更新父节点`element`。然后移除老节点
- 调用`insert`钩子
    - 是首次`patch`并且`vnode.parent`存在，设置`vnode.parent.data.pendingInsert = queue`
    - 如果不满足上面条件则对每个`vnode`调用`insert`钩子
- 返回`vnode.elm`
`nodeOps`上封装了针对各种平台对于`DOM`的操作，`modules`表示各种模块，这些模块都提供了`create`和`update`钩子，用于创建完成和更新完成后处理对应的模块;有些模块还提供了`activate`、`remove`、`destory`等钩子。经过处理后`cbs`的最终结构为:
```js
cbs = {
    create: [
        attrs.create,
        events.create
        // ...
    ]
}
```
最后该函数返回的就是`patch`方法。
### `createElm`
`createElm`的目的创建`VNode`节点的`vnode.elm`。不同类型的`VNode`，其`vnode.elm`创建过程也不一样。对于组件占位`VNode`，会调用`createComponent`来创建组件占位`VNode`的组件实例；对于非组件占位`VNode`会创建对应的`DOM`节点。
现在有三种节点:
- 元素类型的`VNode`:
    - 创建`vnode`对应的`DOM`元素节点`vnode.elm`
    - 设置`vnode`的`scope`
    - 调用`createChildren`创建子`vnode`的`DOM`节点
    - 执行`create`钩子函数
    - 将`DOM`元素插入到父元素中
- 注释和本文节点
    - 创建注释/文本节点`vnode.elm`，并插入到父元素中
- 组件节点：调用`createComponent`
```js
function createElm(vnode, insertedVnodeQueue, parentElm, refElm, nested) {
    // 创建一个组件节点
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
        return
    }
    const data = vnode.data;
    const childre = vnode.children;
    const tag = vnode.tag;
    // ...

    if (isDef(tag)) {
        vnode.elm = vnode.ns
            ? nodeOps.createElementNS(vnode.ns, tag)
            : nodeOps.createElement(tag, vnode)
        setScope(vnode)
        if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        createChildren(vnode, children, insertedVnodeQueue)  
    } else if (isTrue(vnode.isComment)) {
        vnode.elm = nodeOps.createComment(vnode.text);
    } else {
        vnode.elm = nodeOps.createTextNode(vnode.te)
    }
    insert(parentElm, vnode.elm, refElm)
}
```
`createComponent`的主要作用是在于创建组件占位`Vnode`的组件实例, 初始化组件，并且重新激活组件。在重新激活组件中使用`insert`方法操作`DOM`。`createChildren`用于创建子节点，如果子节点是数组，则遍历执行`createElm`方法，如果子节点的`text`属性有数据，则使用`nodeOps.appendChild()`在真实`DOM`中插入文本内容。`insert`用将元素插入到真实`DOM`中。
```js
// core/vdom/patch.js
function createComponent(vnode, insertedVnodeQueue, parentElm, refElm) {
    // ...
    let i = vnode.data.hook.init
    i(vnode, false, parentElm, refElm)
    if (isDef(vnode.componentInstance)) {
        initComponent(vnode, insertedVnodeQueue)
        insert(parentElm, vnode.elm, refElm)
        return true;
    }
}
```
- 执行`init`钩子生成`componentInstance`组件实例
- 调用`initComponent`初始化组件
    - 把之前已经存在的`vnode`队列进行合并
    - 获取到组件实例的`DOM`根元素节点，赋给`vnode.elm`
    - 如果`vnode`是可`patch`
        - 调用`create`函数，设置`scope`
    - 如果不可`patch`
        - 注册组件的`ref`，把组件占位`vnode`加入`insertedVnodeQueue`
- 将`vnode.elm`插入到`DOM Tree`中

在组件创建过程中会调用`core/vdom/create-component`中的`createComponent`,这个函数会创建一个组件`VNode`，然后会再`vnode`上创建声明各个声明周期函数，`init`就是其中的一个周期，他会为`vnode`创建`componentInstance`属性，这里`componentInstance`表示继承`Vue`的一个实例。在进行`new vnodeComponentOptions.Ctor(options)`的时候就会重新创建一个`vue`实例，也就会重新把各个生命周期执行一遍如`created-->mounted`。
```js
init (vnode) {
    // 创建子组件实例
    const child = vnode.componentInstance = createComponentInstanceForVnode(vnode, activeInstance)
    chid.$mount(undefined)
}
function createComponentInstanceForVnode(vn) {
    // ... options的定义
    return new vnodeComponentOptions.Ctor(options)
}
```
这样`child`就表示一个`Vue`实例，在实例创建的过程中，会执行各种初始化操作, 例如调用各个生命周期。然后调用`$mount`，实际上会调用`mountComponent`函数, 
```js
// core/instance/lifecycle
function mountComponent(vm, el) {
    // ...
    updateComponent = () => {
        vm._update(vm._render())
    }
    vm._watcher = new Watcher(vm, updateComponent, noop)
}
```
在这里就会执行`vm._render`
```js
// core/instance/render.js
Vue.propotype._render = function () {
    // ...
    vnode = render.call(vm._renderProxy, vm.$createElement)
    return vnode
}
```
可以看到的时候调用`_render`函数，最后生成了一个`vnode`。然后调用`vm._update`进而调用`vm.__patch__`生成组件的`DOM Tree`，但是不会把`DOM Tree`插入到父元素上，如果子组件中还有子组件，就会创建子孙组件的实例，创建子孙组件的`DOM Tree`。当调用`insert(parentElm, vnode.elm, refElm)`才会将当前的`DOM Tree`插入到父元素中。  
在回到`patch`函数，当不是第一次渲染的时候，就会执行到另外的逻辑，然后`oldVnode`是否为真实的`DOM`，如果不是，并且新老`VNode`不相同，就执行`patchVnode`。
```js
// core/vdom/patch.js
function sameVnode(a, b) {
    return (
        a.key === b.key &&
        a.tag === b.tag && 
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType
    )
}
```
`sameVnode`就是用于判断两个`vnode`是否是同一个节点。
### `patchVnode`
如果符合`sameVnode`，就不会渲染`vnode`重新创建`DOM`节点，而是在原有的`DOM`节点上进行修补，尽可能复用原有的`DOM`节点。  
- 如果两个节点相同则直接返回
- 处理静态节点的情况
- `vnode`是可`patch`的
    - 调用组件占位`vnode`的`prepatch`钩子
    - `update`钩子存在，调用`update`钩子
- `vnode`不存在`text`文本
    - 新老节点都有`children`子节点，且`children`不相同，则调用`updateChildren`递归更新`children`(这个函数的内容放到`diff`中进行讲解)
    - 只有新节点有子节点：先清空文本内容，然后为当前节点添加子节点
    - 只有老节点存在子节点: 移除所有子节点
    - 都没有子节点的时候，就直接移除节点的文本
- 新老节点文本不一样: 替换节点文本
- 调用`vnode`的`postpatch`钩子
```js
function patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly) {
    if (oldVnode === vnode) return
    // 静态节点的处理程序
    const data = vnode.data;
    i = data.hook.prepatch
    i(oldVnode, vnode);
    if (isPatchable(vnode)) {
        for(i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
        i = data.hook.update
        i(oldVnode, vnode)
    }
    const oldCh = oldVnode.children;
    const ch = vnode.children;
    if (isUndef(vnode.text)) {
        if (isDef(oldCh) && isDef(ch)) {
            if (oldCh !== ch) updateChildren(elm, oldCh, ch insertedVnodeQueue, removeOnly)
        } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
        nodeOps.setTextContent(elm, vnode.text)
    }
    i = data.hook.postpatch
    i(oldVnode, vnode)
}
```
## `diff`算法
在`patchVnode`中提到，如果新老节点都有子节点，但是不相同的时候就会调用`updateChildren`，这个函数通过`diff`算法尽可能的复用先前的`DOM`节点。
```js
function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, elmToMove, refElm 
    
    while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (isUndef(oldStartVnode)) {
            oldStartVnode = oldCh[++oldStartIdx]
        } else if (isUndef(oldEndVnode)) {
            oldEndVnode = oldCh[--oldEndIdx]
        } else if (sameVnode(oldStartVnode, newStartVnode)) {
            patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
            oldStartVnode = oldCh[++oldStartIdx]
            newStartVnode = newCh[++newStartIdx]
        } else if (sameVnode(oldEndVnode, newEndVnode)) {
            patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
            oldEndVnode = oldCh[--oldEndIdx]
            newEndVnode = newCh[--newEndIdx]
        } else if (sameVnode(oldStartVnode, newEndVnode)) {
            patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
            canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
            oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
        } else if (sameVnode(oldEndVnode, newStartVnode)) {
            patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
            canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
            oldEndVnode = oldCh[--oldEndIdx]
            newStartVnode = newCh[++newStartIdx]
        } else {
            if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
            idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : null
            if (isUndef(idxInOld)) {
                createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
                newStartVnode = newCh[++newStartIdx]
            } else {
                elmToMove = oldCh[idxInOld]
                if (sameVnode(elmToMove, newStartVnode)) {
                    patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
                    oldCh[idxInOld] = undefined
                    canMove && nodeOps.insertBefore(parentElm, newStartVnode.elm, oldStartVnode.elm)
                    newStartVnode = newCh[++newStartIdx]
                } else {
                    createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
                    newStartVnode = newCh[++newStartIdx]
                }
            }
        }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
}
```
算了这个图没画明白，借用网上的图

![](https://user-gold-cdn.xitu.io/2019/11/19/16e838d98841b736?w=864&h=428&f=png&s=70882)
`oldStartIdx`、`newStartIdx`、`oldEndIdx`以及`newEndIdx`分别是新老两个`VNode`两边的索引，同时`oldStartVnode`、`newStartVnode`、`oldEndVnode`和`new EndVnode`分别指向这几个索引对应的`vnode`。整个遍历需要在`oldStartIdx`小于`oldEndIdx`并且`newStartIdx`小于`newEndIdx`(这里为了简便，称`sameVnode`为相似)
1. 当`oldStartVnode`不存在的时候，`oldStartVnode`向右移动，`oldStartIdx`加`1`
2.  当`oldEndVnode`不存在的时候，`oldEndVnode`向右移动，`oldEndIdx`减`1`
3.  `oldStartVnode`和`newStartVnode`相似，`oldStartVnode`和`newStartVnode`都向右移动，`oldStartIdx`和`newStartIdx`都增加`1`
![](https://user-gold-cdn.xitu.io/2019/11/19/16e838e07db8825f?w=618&h=251&f=png&s=33118)
4. `oldEndVnode`和`newEndVnode`相似，`oldEndVnode`和`newEndVnode`都向左移动，`oldEndIdx`和`newEndIdx`都减`1`
![](https://user-gold-cdn.xitu.io/2019/11/19/16e838e6c3b64972?w=753&h=235&f=png&s=34012)
5. `oldStartVnode`和`newEndVnode`相似，则把`oldStartVnode.elm`移动到`oldEndVnode.elm`的节点后面。然后`oldStartIdx`向后移动一位，`newEndIdx`向前移动一位

![](https://user-gold-cdn.xitu.io/2019/11/19/16e8394452924462?w=1280&h=645&f=png&s=187748)
6. `oldEndVnode`和`newStartVnode`相似时，把`oldEndVnode.elm`插入到`oldStartVnode.elm`前面。同样的，`oldEndIdx`向前移动一位，`newStartIdx`向后移动一位。
![](https://user-gold-cdn.xitu.io/2019/11/19/16e839410fa6d339?w=810&h=432&f=png&s=98480)
7. 当以上情况都不符合的时候
生成一个`key`与旧`vnode`对应的哈希表  
```js
function createKeyToOldIdx (children, beginIdx, endIdx) {
    let i, key
    const map = {}
    for (i = beginIdx; i <= endIdx; ++i) {
        key = children[i].key
        if (isDef(key)) map[key] = i
    }
    return map
}
```
最后生成的对象就是以`children`的`key`为属性，递增的数字为属性值的对象例如
```js
children = [{
    key: 'key1'
}, {
    key: 'key2'
}]
// 最后生成的map
map = {
    key1: 0,
    key2: 1,
}
```
所以`oldKeyToIdx`就是`key`和旧`vnode`的`key`对应的哈希表
根据`newStartVnode`的`key`看能否找到对应的`oldVnode`
- 如果`oldVnode`不存在，就创建一个新节点，`newStartVnode`向右移动
- 如果找到节点:
    - 并且和`newStartVnode`相似。将`map`表中该位置的赋值`undefined`(用于保证`key`是唯一的)。同时将`newStartVnode.elm`插入啊到`oldStartVnode.elm`的前面，然后`index`向后移动一位
    - 如果不符合`sameVnode`，只能创建一个新节点插入到`parentElm`的子节点中，`newStartIdx`向后移动一位
8. 结束循环后
    - `oldStartIdx`又大于`oldEndIdx`，就将新节点中没有对比的节点加到队尾中
    
    ![](https://user-gold-cdn.xitu.io/2019/11/19/16e83a83366194d3?w=784&h=373&f=png&s=73559)
    - 如果`newStartIdx > newEndIdx`，就说明还存在新节点，就将这些节点进行删除
    
    ![](https://user-gold-cdn.xitu.io/2019/11/19/16e83a871c34ea5f?w=836&h=367&f=png&s=77933)
## 总结
本篇文章对数据发生改变时，视图是如何更新进行了讲解。对一些细节地方进行了省略，如果需要了解更加深入，结合源码更加合适。我的[github](https://github.com/skychenbo/Blog)请多多关注，谢谢