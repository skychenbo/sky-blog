最近一段时间在阅读Vue源码，从它的核心原理入手，开始了源码的学习，而其核心原理就是其数据的响应式。并且结合设计模式进行学习
## 观察者模式&&发布订阅者模式
这里简短的介绍这两种模式的联系和差异，
### 观察者模式
![](https://user-gold-cdn.xitu.io/2019/10/31/16e1fd8969c72e17?w=982&h=377&f=png&s=37340)
观察者模式定义了对象间的一种一对多的依赖关系，当一个对象的状态发生改变时，所有依赖于它的对象都将得到通知，并自动更新。观察者模式属于行为型模式，行为型模式关注的是对象之间的通讯，观察者模式就是观察者和被观察者之间的通讯。

观察者模式有一个别名叫“发布-订阅模式”，或者说是“订阅-发布模式”，订阅者和订阅目标是联系在一起的，当订阅目标发生改变时，逐个通知订阅者。我们可以用报纸期刊的订阅来形象的说明，当你订阅了一份报纸，每天都会有一份最新的报纸送到你手上，有多少人订阅报纸，报社就会发多少份报纸，报社和订报纸的客户就是上面文章开头所说的“一对多”的依赖关系。
### 发布订阅者模式
![](https://user-gold-cdn.xitu.io/2019/10/31/16e1fd8c3382e353?w=699&h=232&f=png&s=18098)
其实24种基本的设计模式中并没有发布订阅模式，上面也说了，他只是观察者模式的一个别称。

但是经过时间的沉淀，似乎他已经强大了起来，已经独立于观察者模式，成为另外一种不同的设计模式。

在现在的发布订阅模式中，称为发布者的消息发送者不会将消息直接发送给订阅者，这意味着发布者和订阅者不知道彼此的存在。在发布者和订阅者之间存在第三个组件，称为调度中心或事件通道，它维持着发布者和订阅者之间的联系，过滤所有发布者传入的消息并相应地分发它们给订阅者。

举一个例子，你在微博上关注了A，同时其他很多人也关注了A，那么当A发布动态的时候，微博就会为你们推送这条动态。A就是发布者，你是订阅者，微博就是调度中心，你和A是没有直接的消息往来的，全是通过微博来协调的（你的关注，A的发布动态）。
### 差异
可以看出，发布订阅模式相比观察者模式多了个事件通道，事件通道作为调度中心，管理事件的订阅和发布工作，彻底隔绝了订阅者和发布者的依赖关系。即订阅者在订阅事件的时候，只关注事件本身，而不关心谁会发布这个事件；发布者在发布事件的时候，只关注事件本身，而不关心谁订阅了这个事件。

观察者模式有两个重要的角色，即目标和观察者。在目标和观察者之间是没有事件通道的。一方面，观察者要想订阅目标事件，由于没有事件通道，因此必须将自己添加到目标(Subject) 中进行管理；另一方面，目标在触发事件的时候，也无法将通知操作(notify) 委托给事件通道，因此只能亲自去通知所有的观察者。
## 响应式原理
当我们在`data`中定义一个值的时候，如下:
```js
const vm = new Vue({
    data() {
        return {
            message: ''
        }
    },
    template: '<div>{{message}}</div>'
})
vm.message = 'hello';
```
此时`Vue`内部发生了什么，下面列出需要解决的问题如下：
1. 如何进行依赖收集的
2. 当`data`中的值发生改变时，是如何更新视图的   

![](https://user-gold-cdn.xitu.io/2019/10/30/16e1c6ea574f072e?w=739&h=244&f=png&s=21998)  
上面是表示定义一个`data`值的时候，内部这个流程是如何的，结合讲解相信你对响应式原理有更深入的理解。为了让结构更加清晰，这里只考虑一个视图，并且不会有`computed`的情况。
在讲解原理之前，首先对几个单词进行定义:
- Watcher: 订阅者
- Observer: 观察者
- Dep: 发布者
- Data: 实例中的数据项
### `Observer`
首先看看当实例化`Vue`的时候，对`data`是如何进行处理的
```js
 _init
    => mount
    => this._watcher = new Watcher(vm, updateComponent, noop)
    => Dep.target = this._watcher
    => observe(data, true)
    => new Observer(data)
```
1. 首先`new Vue`会调用`_init`函数
2. `mount`把需要渲染的模板挂载到元素上
3. 创建一个`Watcher`实例
4. 将上面创建的`Watcher`实例赋值给`Dep.target`
5. 对`data`返回的数据进行`observe`
6. 调用`new Observer`遍历`data`进行`setter`和`getter`绑定

下面来看看`observe`函数的实现：
```js
function observe(value, asRootData) {
    let ob;
    // 检测当前数据是否被observe过，如果是则不必重复绑定
    if(hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__
    } else {
        ob = new Observer(value);
    }
    if (asRootData && ob) {
      ob.vmCount++;
    }
    return ob;
}
```
首先调用的就是上面这个函数，`__ob__`用户判断是否有`Observer`实例，如果有就使用原来的，如果没有就创建一个新的`Observer`实例。`vmCount`表示该`Vue`实例使用的次数，`asRootData`表示是否是`data`的跟，例如在一个`template`中一个相同的组件使用了两次:
```html
<div>
  <my-component />
  <my-component />
</div>
```
这个时候`vmCount`就为`2`。接下来看`Observer`的实现:
```js
class Observer {
    constructor(value) {
        this.value = value;
        this.dep = new Dep();
        this.vmCount = 0;
        def(value, '__ob__', this)
        if (Array.isArray(value)) {
            // 如果是数组则需要遍历数组的每个成员进行observe
            // 这里会对数组原有的方法进行重新定义
            this.observeArray(value)
        } else {
            // 如果对象则调用下面的程序
            this.walk(value)
        }
    }
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]])
        }
    }
}
```
下图是`Observer`类的结构  
![](https://user-gold-cdn.xitu.io/2019/11/4/16e356b18658ec37?w=982&h=352&f=png&s=13615)
这里主要就是遍历`data`中定义的值，然后在每个遍历的属性下面添加`__ob__`，然后在`__ob__`定义`Dep`，根据数据类型的不同调用不同的方法，如果是数组则使用`observeArray`，该方法会重写数数组的7种方法，对数组的每个成员调用`observe`函数，如果是普通对象，则遍历他的属性调用`defineReactive`，进行`getter/setter`绑定。 
`defineReactive`是`Vue`最核心的内容，使用方法如: `defineReactive(obj, keys[i], obj[keys[i]])`。当在`data`中定义一个属性的时候，当我们更改该值的时候，视图是如何知道，这个值发生了改变来更新视图的。
```js
function defineReactive(obj, key, val) {
  // 在闭包中定义一个dep对象
  const dep = new Dep();
  // 对象的子对象递归进行observe并返回子节点的Observer对象
  let childOb = observe(val);
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;
      if (Dep.target) {
        // 进行依赖收集，dep.depend就是将dep和watcher进行互相绑定
        // Dep.target表示需要绑定的watcher
        dep.depend();
        if (childOb) {
          // 子对象进行依赖收集，其实就是将同一个watcher观察者实例放进两个depend中
          // 一个是正在本身闭包中的depend，另一个是子元素的depend
          childOb.dep.depend();
        }
        if (Array.isArray(value)) {
          // 如果是数组，需要对数组的每个成员都进行依赖收集
          dependArray(value)
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      // 通过getter方法获取当前值，与新值发生比较，一致则不需要执行下面的操作
      const value = getter ? getter.call(obj) : val;
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return false;
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 新的值需要重新observe，保证数据响应式
      childOb = observe(newVal)
      // 通知所有观察者
      dep.notify()
    }
  })
}
```
通过`Object.defineProperty`把数据进行了`getter`和`setter`绑定。`getter`用于依赖收集，`setter`用于通过`dep`去通知`watcher`, `watcher`进行执行变化。
如何进行依赖收集的，可以通过一个例子进行解释:
```js
data() {
  return {
    message: [1, 2]
  }
}
```
结合一个流程图进行分析上面例子:
```js
observe(data)
=> data.__ob__ = new Observer(data)
=> walk(data)
=> childOb = observe(message)
  => message.__ob__ = new Observer(data)
  => message.__ob__.dep = new Dep;
=> childOb ? childOb.dep.depend();
```
分析其过程就是:
1. 先对`data`函数返回的对象添加`__ob__`，返回具体的内容如下:
```js
const res = {
  message: [1, 2]
  __ob___: new Observer(data)
}
```
2. 遍历`res`, 因为`res`为对象，所以执行`walk`
3. 执行到`observe(message)`
4. 给`message`添加`__ob__`，`__ob__`上存在一个`dep`用于依赖收集
5. `childOb = message.__ob__`，此时同一个`watcher`放入子对象中，也就是`message.__ob__.dep`中
回顾上面的分析，就能够区分出`Observer`和`defineReactive`中两个`dep`的区别了，这两个地方都声明了`new Dep`，`Observer`的`dep`用于收集对象和数组的订阅者，挂载在对象的属性上。当对象或者数组增删元素时调用`$set`，获取到`__ob__`进行依赖收集，然后调用`ob.dep.notify`j进行更新。在`defineReactive`中，这个`dep`是存在一个闭包中，这是对对象属性服务的，在获取属性值的时候进行依赖收集，设置属性值的时候发布更新。
### `Dep`
下面来介绍一下`dep`，源码如下：
```js
let uid = 0;
class Dep {
  constructor() {
    this.id = uid++;
    this.subs = []
  }
  // 添加一个订阅者
  addSub(sub) {
    this.subs.push(sub)
  }
  // 移除一个观察者对象
  removeSub(sub) {
    remove(this.subs, sub)
  }
  // 依赖收集，当存在Dep.target的时候添加观察者对象
  depend() {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
  // 通知所有订阅者
  notify() {
    const subs = this.subs.slice();
    for(let i = 0, l = subs.length; i < l; i++) {
      subs[i].update();
    }
  }
}
```
结构如下:
![](https://user-gold-cdn.xitu.io/2019/11/4/16e35722de8ccd5c?w=989&h=358&f=png&s=33051)
当对象中的属性触发`get`的时候，先前`defineReactive`中`const dep = new Dep()`闭包中，就会把当前的`Watcher`订阅者加入到`subs`中。
`Dep`是发布订阅者模型中的发布者，`Watcher`是订阅者，一个`Dep`实例对应一个对象属性或一个被观察的对象，用于收集和数据改变时，发布更新。比如说有这个一个`data`
```js
data() {
  return {
    message: 'a'
  }
}
```
触发视图有两种方法:
1. 利用`getter/setter`，重新设置`message`的值，设置的过程中会触发`dep.notify`进行发布更新, 比如`this.message = 'b'`
2. 使用`$set`函数: `this.$set(this.message, 'fpx', 'number-one')`，这会获取到`message`的`__ob__`上的`dep`进行发布更新
### `Watcher`
`Watcher`是一个订阅者。依赖收集后`watcher`会被存放在`Dep`的`subs`中，数据变动的时候通过`dep`发布者发布信息，相关的订阅者`watcher`收到信息后通过`cb`进行视图更新。
`Watcher`内容很多，我们只关注最重要的一些部分：
```js
class Watcher {
  constructor(vm, expOrFn, cb, options) {
    this.vm = vm;
    // 存放订阅者实例
    vm._watchers.push(this)
    this.deps = [];
    this.newDeps = []
    this.depsIds= new Set();
    this.newDepIds new Set();
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
    }
    this.value = this.get();
  }
  get() {
    pushTarget(this)
    const vm = this.vm;
    value = this.getter.call(vm, vm);
    popTarget();
    this.cleanupDeps();
    return value
  }
  // 添加一个依赖关系到Deps集合中
  addDep(dep) {
    const id = dep.id;
    if (!this.newDepsIds.has(id)) {
      this.newDepsIds.add(id)
      this.newDeps.push(dep);
      // 这里做一个去重，如果depIds里包含这个id，那么之前给depId添加这个id的时候
      // 已经调用过dep.addSub(this)，避免了重复添加
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }
  // 用于更新模板
  update() {
    if (this.sync) {
      // 同步则执行run直接渲染视图
      this.run();
    } else {
      // 异步推送到观察者队列中，下一个tick时调用，最后会调用run方法
      queueWatcher(this)
    }
  }
  // 收集该watcher的所有deps原理
  depend() {
    let i = this.deps.length;
    while(i--) {
      this.deps[i].depend();
    }
  }
}
```
`Watcher`结构如下:
![](https://user-gold-cdn.xitu.io/2019/11/4/16e35729ad3e65d7?w=869&h=505&f=png&s=77810)
首先还是理清`Watcher`构造函数做的事情:
```js
Dep.target = new Watcher(vm, updateComponent, noop = {})
  => 初始化变量
  => 获取getter函数
  => 调用get函数，get函数会调用getter函数，从而收集依赖
```
在创建`Vue`实例的时候，触发`getter`就会进行依赖收集，下面是这几种情况:
`Watcher`有四个使用的场景，只有在这四种场景中，`Watcher`才会收集依赖，更新模板或表达式
1. 观察模板中的数据
2. 创建`Vue`实例时`watch`选项里的数据
3. `computed`选型里的数据所依赖的数据
4. 使用`$watch`观察的数据或者表达式
在前面代码中声明了`Dep.target`，这个是干嘛用的呢。在前面提到依赖收集的时机，是当我们获取元素属性值的时候，但是此时不知道哪个是正确的`watcher`，所以定义一个全局变量记录当前的`Watcher`，方便添加当前正在执行的`Watcher`。
`Watcher`对象中有两个属性: `deps`和`newDeps`。他们用来记录上一次`Watcher`收集的依赖和新一轮`Watcher`收集的依赖，每一次数据的更新都需要重新收集依赖, 流程如下:
```js
setter
  => notify
  => run
  => get
```
当数据发布更新后，会调用`notify`方法，`notify`会调用`run`方法，`run`方法会调用`get`方法，重新获取值，重新进行依赖收集。举一个上面的例子，如果我们更改了`message`的值，并且模板依赖了新更改的值，`this.message = {key: 'val'}`，因为上一轮没有对新值进行依赖，所以这一轮需要重新收集依赖。

## 总结
在`Vue`初始化的时候，会生成一个`watcher`，依赖收集就是通过属性的`getter`完成的。结合文章开头给出的图片，`Observer`和`Dep`是一对一的关系，`Dep`和`Watcher`是多对多的关系，`Dep`则是`Observer`和`Watcher`之间的纽带。依赖收集完成偶，当属性变化会执行被`Observer`对象的`dep.notify()`方法，这个方法会遍历订阅者`Watcher`列表向其发送消息，`Watcher`会执行`run`方法去更新视图。

本来还想讲点`computed`的，但是估计您看着也累，我写着也累，`computed`将由另外一篇文章进行讲解。  
一篇文章写下来，颇有些难度。下面有三点:
1. 代码太多: 因为源码考虑的情况很多，当我们对单个点进行分析的时候，我们需要摒弃其他没有必要的代码
2. 流水账：记录每行代码的作用，没有对更深层次的进行探索
3. 有机结合：分析了以后，不能和以前学习的知识进行结合

所以给出一些措施来弥补这些问题:
1. 尽量少些代码，把整个流程图画出来，图比代码更加直观
2. 从点上，扩展到线，在扩展到面进行思考
3. 结合以前学过的知识，比如说这里的设计模式，结合起来学习
第一次写这种源码分析文章，诸多不足，欢迎大家提出宝贵的建议，也请多多关注我的[GitHub](https://github.com/skychenbo/Blog)~~