---
# 主题使用方法：https://github.com/xitu/juejin-markdown-themes
theme: juejin
highlight: juejin
---

# ES2015(ES6)
`2015`是`JS`发展的黄金时间，委员会提出的`ES6`在`ES5`的基础上增加了大量的新特性。  
下面是`ES6`的主要更新
- let、const关键字
- 箭头函数
- class 类
- 模块(import/export)
- 模板语法
- 函数参数默认值
- rest参数
- 数组/对象 解构
- Promise

## Let/Const
`ES6`增加了`let/const`关键字用于解决原来只有函数作用域的问题，例如以下:
```js
{
  let a = 10;
  const b = 10;
  var c = 20;
  a = 20;
  b = 30; // Assignment to constant variable
}
a // a is not defined
c // 20
```
## 箭头函数
在`ES5`中，我们需要以下面方式定义函数
```js
function sum(value1, value2) {
  return value1 + value2
}
```
但是在箭头函数中可以写更少的代码，如下:
```js
const sum = (value1, value2) => {
  return value1 + value2;
}
```
## class类
在`ES5`中我们是通过原型的方式定义一个类，在`ES6`中可以通过`class`的方式来声明一个类。  
下面是`ES5`用于创建构造函数的方式
```js
function Calcutor(moneyBeforeDiscount) {
  this.moneyBeforeDiscount = moneyBeforeDiscount;
}

Calcutor.prototype.moneyAfterDiscount = function (discountRate) {
  return this.moneyBeforeDiscount * (100-discountRate)/100;
}
const demo = new Calcutor(5000)
console.log(demo.moneyAfterDiscount()); // 4000
```
下面是`ES6`的方式创建类
```js
class Calculator{
    constructor(moneyBeforeDiscount){
        this.moneyBeforeDiscount = moneyBeforeDiscount;
    }
    moneyAfterDiscount(discountRate){
        return this.moneyBeforeDiscount * (100-discountRate)/100;
    }
}
const demo = new Calculator(5000);
console.log(demo.moneyAfterDiscount()); // 4000
```
## 模块(import/export)
在`ES6`之前，js没有原生的模块管理方式。在`ES6`中，我们在文件中导出函数和和变量，然后在另外一个文件引入他们。  
如下:
```js
// calculator.js
const add = (a, b) => a +b
const multiply = (a, b) => a + b

export {add, multiply}

// App.js
import { add } from './calculator'

console.log(add(2, 3))
```
## 模板语法
在`ES6`之前，我们如果需要在把字符串和变量进行拼接，需要向以下的方式进行书写
```js
const count = 3;
const str = 'count: ' + count;
```
这种方式相当繁琐，于是`ES6`引入了模板字符串解决上面这个问题
```js
const count = 3;
const str = `count: ${count}`
```
此外也可以在`${}`写一些简单的逻辑，如下:
```js
const count = 3;
const str = `count: ${count + 2}`
```
## 函数参数默认值
在`ES6`之前不能直接指定函数参数的默认值，只能使用变通的方法:
```js
function log(x, y) {
  if (typeof y === 'undefined') {
    y = 'World';
  }
  console.log(x, y)
})
```
`ES6`允许为函数的参数设置默认值，即直接写在参数定义的后面
```js
function log(x, y = 'world') {
  console.log(x, y)
}
```
## rest参数
`ES6`引入了`rest`参数，用于获取函数的多余参数，这样就不需要使用`arguments`对象了。
这是`ES6`之前的获取多余参数的写法
```js
function getParams() {
  return Array.prototype.slice.call(arguments)
}
```
使用`ES6`的语法
```js
function getParams(...params) {
  return params;
}
```
## 数组和对象解构扩展
对象和数组的解构通常用于需要从数组或者对象中拿到某个属性值。
如下:
```js

```
数组解构，`let/const`后面跟上一堆用中括号`[]`包裹的变量列表，变量的值为对应位置上的数组元素的值，如下:
```js
const [a, b] = [1, 2]
console.log(a, b) // 1, 2
```
对象解构就是找到对象对应的属性值然后赋值给变量，如下:
```js
const {x, y} = {x: 1, y: 2}
console.log(x, y) // 1, 2
```
## Promise
`Promise`通常用于处理例如http请求或者消耗大量时间的程序。`Promise`可以将结果传递给`then`函数，`then`函数处理结果会返回一个`Promise`，继续调用`then`进行处理结果，如果抛出错误，可以使用`catch`进行捕获
```js
fetch('/')
  .then(response => response.json())
  .then(result => {
    console.log(result)
  })
```

# ES2016(ES7)
`ES7`在`ES6`的基础上主要扩展了一些数组的方法例如`.includes()`，还有指数运算符`**`
## Array.includes()
```js
const number = [1, 2, 3]
console.log(number.includes(1)); // true
console.log(number.includes(7)); //false
```
## 指数运算符
```js
console.log(2** 3)
```
# ES2017(ES8)
`ES8`添加了关键字`async/await`，让处理异步程序更加方便。我们能够通过使用它避免面条代码，提高异步代码的可读性
下面是`ES6`的异步方式
```js
fetch('/')
  .then(response => {
    response.json()
  })
  .then(result => {
    console.log(result)
  })
```
使用`ES8`，先给函数添加关键字`async`，然后在异步代码前添加`await`，异步代码会`block`整个`js`线程，只有异步代码返回结果以后，`js`才会继续执行，上面代码可以改成以下形式
```js
async function fn() {
  const response = await fetch('/');
  const result = await response.json();
  console.log(result);
}
```
# ES2018(ES9)
`ES9`没有增加新的东西，但是增强了`rest`和扩展运算符。
## rest运算符
我们在对象属性上使用`rest`。他简化了从对象中抽取某个属性，剩余属性赋值给另外一个对象的过程，如下:
```js
const options = {
  enabled: true,
  text: 'Hello',
  color: 'red'
}
const {enabled, ...others} = options;
console.log(enabled) // true
console.log(others) // {   text: 'Hello', color: 'red' }
```
## 对象的扩展符
在对象前面加扩展运算符`...`，就会浅浅拷贝当前对象的属性值赋值给新对象
```js
const options = {
  text: 'Hello'
}
const param = {enabled: true, ...options}
console.log(param) // {enabled: true, text: 'Hello', }
```

# ES2019(ES10)
`ES10`让使用`try/catch`更加简单，不需要声明一个`Error`然后去捕获他。  
以下是以前的情况，`catch`需要一个`error`参数
```js
// before
try {
  fetch('/')
} catch (error) {
  console.log(error)
}
```
之后`catch`中的`error`是可选的，这对不需要知道抛出的错误是什么的场景可能有些帮助
```js
try {
  fetch('/')
} catch {
  // 处理你的逻辑
}
```
# ES2020(ES11)
`ES11`增加一些新特性
- 动态引入
- BigInt
- 空值合并运算符
- 可选链

## 动态引入
在`ES6`当我们需要引入资源需要在文件开头地方地方使用`import`，这是一种静态的引入方式。动态引入解决的问题就是可能资源太多包体积太大，有些资源可以通过动态引入的方式进行减少包体积，具体如下:
```js
let stageId = 'A'
let stage

if (stageId === 'A') {
  stage = await import('./stages/A')
} else {
  stage = await import('./stages/B')
}

stage.run();
```
## BigInt
`Js`中`Number`类型只能安全的表示`-(2^53-1)`至 `2^53-1`范的值，即`Number.MIN_SAFE_INTEGER`至`Number.MAX_SAFE_INTEGER`，超出这个范围的整数计算或者表示会丢失精度。
创建一个BigInt类型可以使用一下两种方式:
```js
const big = 12344n

const alsoBig = BigInt(20)
```
## 控制合并运算符
在获取变量值的时候，通常为了避免为`null`或未定义，通常需要提供默认值。目前，在`JavaScript`中表达这种意图的一种典型方法是使用`||`操作符
```js
const score = null;
console.log(score || 'no-score') // no-score
```
这对于`null`或者`undefined`值的常用情况是可行的，但是存在很多变量并不是`null`或者`undefined`，但是取到了一个默认值，如下:
```js
const score = 0;
console.log(score || 'no-score') // no-score
```
此时打印的结果仍然是`no-score`，使用ES11的方式就可以避免前面不是`undefined`或者`null`但是布尔值是`false`的情况如下：
```js
const score = 0;
console.log(score ?? 'no-score') // 0
```
## 可选链
假如有以下一个对象，属性嵌套很深
```js
const student ={
        profile:{
            school:{
                name:'RUPP'
            }
        }
    }
```
当我们需要获取这个`name`属性的时候通常需要向以下的格式进行书写`student.profile.school.name`，但是如果`student`上`profile`属性不存在，那么就会抛出以下错误:
```js
Uncaught TypeError: Cannot read property 'school' of undefined
```
所以为了避免这种情况，我们可以通过if条件语句判断一下`student`的`profile`属性是否存在，如果存在才会继续访问内部的属性
```js
if (student.profile && student.profile.school) {
  return student.profile.school.name
}
```
但是上面这种写法太长了，需要检测对象是否具有某个属性。这种情况就可以使用`?.`语法来判断对象上是否有该属性，具体使用方式如下:
```js
return student?.profile?.school.name
```
这就避免了在访问对象属性的时候可能会出现报错的情况
