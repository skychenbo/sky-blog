当我们需要间隔一段时间或者每段时间间隔执行一个特定的函数，这个时候就需要借助定时器。  
javaScript提供了两种方法:
- setInterval
- setTimeout
这两种方法可以直接直接在react中使用，但是有些差异需要注意。在这篇文章中，就会讲解定时器函数在hooks的使用，并且如何在hooks对其进行封装。下面通过一个例子进行讲解
# 需求分析
我们需要创建一个简单的定时器应用，这个定时器具有以下两个特点:
- html中展示的值需要每秒都增加1
- 有按钮能够控制定时器的结束和开始
在React Class Component中实现这个需求其实很简单，就和正常的代码编写了一样就行。但是在hooks中和class component的写法不一样，所以实现方式不太一样。
# 具体实现
首先我们需要两个变量，一个用于表示定时器的开关，一个用于表示当前计数器累加的值。
```js
import React, { useState, useEffect } from 'react';
const [timer, setTimer] = useState(false);
const [counter, setCounter] = useState(false)
```
`useState`会返回一个数组，数组的第一项表示当前的状态值，第二个变量是函数用于更改当前值。上述代码中timer用来控制定时器的开关，counter用来表示计数器的值。
接下来使用useEffect来处理定时器。useEffect主要是用来处理具有副作用的函数，例如状态值的更改，改变DOM、网络请求等等。调用方式如`useEffect(fn, arr)`，第一个参数接受一个包含命令式、且有可能有副作用的函数，第二个参数用于决定副作用函数什么执行。  
假如我们不提供第二个参数，这个副作用函数在每次render的时候都执行一遍；当添加第二个参数的时候，只有当第二个参数发生发生改变的时候，副作用函数才会执行。如果想这个副作用函数在渲染过程中只执行一遍，那么第二个参数就需要是空数组。  
在这个定时器中我们使用useEffect来进行计数，同时第二个参数传入timer来控制定时器的开始和结束。当timer为true的时候，开始定时器，当timer为false的时候终止定时器。  
下面是具体的代码
```js
useEffect(() => {
  let interval;
  if (timer) {
      interval = setInterval(() => {
        console.log('setInterval')
      }, 1000)
  } else {
    clearInterval(interval)
  }
  return () => clearInterval(interval);
}, [timer])
```
上面代码我们就期望的时候，当timer为true的时候，定时器开始，然后每秒都打印`setInterval`。在上面代码中有两个地方对清除了定时器，一个是timer为false的情况，另外一个是组件被卸载的时候。需要注意的是，如果在当前代码中执行了有副作用的操作，一定记得清除他。我在代码中就遇到过前端很少见的内存泄漏，多个组件来回切换没有处理这些副作用，内存占用率会越来越高。  
接下来就是增加counter。直接的方式就是使用setCounter，这个函数可以接受一个确定值来设置counter，也可以接受一个函数，这个参数的参数就是上个阶段的值。  
下面是调用方式:
```js
setCounter(counter => counter + 1)
```
把上面代码加入咱们的定时器中
```js
useEffect(() => {
  let interval;
  if (timer) {
    interval = setInterval(() => {
      console.log('In setInterval', counter);
    }, 1000);
    setCounter(100);
  } else {
    clearInterval(interval);
  }
   return () => clearInterval(interval);
}, [timer]);
```
神奇的事情发生了当我们更改timer为true的时候，因为内部其实调用了setCounter(100), 我们期望能够除了第一次打印出来的counter，以后的每一秒能够打印100。但是事实和我们想象的并不同，即使设置了counter的值，打印出来的counter值仍然是100。 所以我们需要这么一个变量，他能够满足不会重新让组件重新渲染，但是能够跟踪变量的变化。所幸的是useRef提供了这样的能力。
具体调用方式如下:
```js
const refContainer = useRef(initialValue)
```
useRef 返回一个可变的 ref 对象，其 .current 属性被初始化为传入的参数（initialValue）。返回的 ref 对象在组件的整个生命周期内保持不变。所以我们就可以使用useRef来存储counter，既能保证组件不重新渲染，又能保证跟踪到值的变化
```js
import { useRef } from 'react';

const counterRef = useRef(counter);
countRef.current = counter;
```
这样我们在定时器就使用了`countRef.current`代替了原有的`counter`变量，具体如下:
```js
useEffect(() => {
  let interval;
  if (timer) {
    interval = setInterval(() => {
      let currCount = countRef.current;
      setCounter(currCount => currCount + 1);
    }, 1000);
  } else {
      clearInterval(interval);
  }
 return () => clearInterval(interval);
}, [timer]);
```
这样在useEffect中就能够拿到更新后的值。
接下来就是创建两个函数用于更改timer和重置counter的值
```js
const manageTimer = () => {
  setTimer(!timer);
}

const reset = () => {
  setCounter(0);
}
```
最后一步就是添加响应的html
```html
<div className={style.btnGrpSpacing}>
  <Button
    className={style.btnSpacing} 
    onClick={() => manageTimer()}>
      {timer ? 'Stop Timer': 'Start Timer'}
  </Button>
  <Button 
    className={style.btnSpacing} 
    variant= 'info'
    onClick={() => reset()}>
      Reset Counter
  </Button>
</div>

<div className={style.radial}>
  <span>{counter}</span>
</div>
```
# 封装setInterval
参考react-use的useInterval的使用方法, useInterval接受两个参数，一个是定时器执行的函数，另外一个是表示是否清除定时器。
```js
const [delay, setDelay] = React.useState(1000);
const [isRunning, toggleIsRunning] = useBoolean(true);
userInterval(
  () => {
    setCount(count + 1)
  , isRunning ? delay : 0}
)
```
从上面例子我们可以看到，如果单纯的使用`useState`会导致setInterval中每次拿到的都是初始值，这是因为闭包的原因。那设想如果我每次给interval传递一个函数，这个函数每次渲染都能拿到新的值，那么这个问题不就解决了吗?
那怎么在每次渲染的时候都能拿到生成的新函数呢，这里就可以使用useEffect，每次useEffect从获取到从外部传进来最新的函数，然后定时器过程中每次调用他。具体代码如下：
```js
import { useEffect, useRef } from 'react';

const useInterval = (callback: Function, delay?: number | null) => {
  const savedCallback = useRef<Function>(() => {});

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    if (delay !== null) {
      const interval = setInterval(() => savedCallback.current(), delay || 0);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [delay]);
};
```
上面这段代码就能够满足我们拿到的callback始终是经过重新渲染后的最新的callback，这个callback可以读取到最新的props和state
# 使用setTimeout
setTimeout和之前使用setInterval的方式一致，但是也需要注意的是变量值的不更新的问题，例如像下面这种方式
```js
useEffect(() => {
  const timer = setTimeout(() => {
    console.log(counter);
  }, 2000);
  setCounter(100);
return () => clearTimeout(timer);
}, []);
```
这种方法依然会导致打印counter的值不发生改变，为什么不发生改变呢，是因为闭包的原因，在setInterval中引用的始终是第一次的变量，就导致值无法更改。所以也需要使用useRef来承接counter的值。  
setTimeout的封装就不继续讲了，具体的封装可以参考react-use的[useTimeout](https://github.com/streamich/react-use/blob/master/src/useTimeoutFn.ts)。如果使用setTimeout会存在闭包导致值的不更新，所以需要每次都更新这个callback，拿到最新的值。

> 欢迎关注「前端好好学」，前端学习不迷路或加微信 ssdwbobo，一起交流学习
