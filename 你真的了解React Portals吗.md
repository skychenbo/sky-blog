在以往编写全局遮罩的时候，我通常是使用fixed定位，示例代码如下:
```css
.modal {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index:500;
  background: black;
}
```
这样来实现全局遮罩层，modal里边的内容自己控制。但是这样会存在一个问题，具体如下:
![](https://imgkr2.cn-bj.ufileos.com/d8d3a448-1a5f-4fa8-b111-de6e7b6820cc.png?UCloudPublicKey=TOKEN_8d8b72be-579a-4e83-bfd0-5f6ce1546f13&Signature=aAEOpBItMPW8BHA6W%252BfvDkWVjvg%253D&Expires=1604809462)

可以看到这个弹窗的内容并不是在body下面的一层，而是在层层嵌套的dom里边，这样会存在两个弊端：
1. DOM结构不够优雅
2. 父组件的样式可能会影响子组件的样式  

这里提及一个真实案例，同事也是用的上面fixed定位的方式生成全局弹窗，但是发现按钮点击无法更改弹窗的显示，然后发现写了一个巨奇葩的代码，大概代码如下:
```html
<!-- 这里是子组件 -->
return (
  <button>
    <span>toggle visible</span>
    <modal visible={visible}></modal>
  </button>
)
```
然后就发现狂点这个按钮不能控制modal的显示隐藏，因为这个button严重影响了modal的行为。  
这种其实是很难排查问题的，你不知道用户写了什么奇葩的代码，这个时候就考虑其他方式来规避这个问题。在用户使用`modal`的时候，这个`modal`的dom实际是挂载在当前组件下，试想如果把这个DOM直接插入body下是不是可以规避这些问题  
所幸的是React提供了这样的能力，下面介绍一下react提供的在子节点渲染到父组件以外的DOM节点的Portal

# Portal介绍
Portal能够将子组件渲染到父组件以外的DOM树，他通常用于需要子组件需要从父组件的容器中脱离出来的场景，有以下场景:
- Dialog 对话框
- Tooltip 文字提示
- Popover 弹出框
- Loader 全局loader

下面是他的使用方法: 
```jsx
React.createPortal();
```
第一个参数（child）是任何可渲染的 React 子元素，例如一个元素，字符串或 fragment。第二个参数（container）是一个 DOM 元素。  
下面是使用`react.createPortal`的简单实例:
```jsx
const Modal = ({message, visible, onClose, children}) => {
  if (!visible) return null;
  return ReactDOM.createPortal(
    <div class="modal">
      <span className="message">{message}</span>
      <button onClick={onClose}>Close</button>
    </div>
  , domNode)
}
```
虽然portal脱离了父组件的容器限制，但是他的表现和正常的React组件一致。同样能够接收props和context。这是因为portal仍然存在react的层级树中。

## 为什么需要Portal
就如文章开头提到的一个案例，在某个组件中我们需要使用modal弹窗，大多数情况下我们可以使用fixed定位让这个弹窗全局展示，但是特殊情况下， 这个modal弹窗可能会显示不正常。所以这个时候如果我们使用了portal的方式直接modal的dom结构脱离父组件的容器，就可以规避这种问题。
```jsx
const Modal = ({message, isOpen, onClose, children}) => {
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div className="modal">
      <span>{message}</span>
      <button onClick={onClose}>Close</button>
    </div>
  , document.body)
}
function Component() {
  const [open, setOpen] = useState(false)
  return (
    <div className="component">
      <button onClick={() => setOpen(true)}></button>
      <Modal
        message="Hello World!"
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
```
上面这段代码就能够保证，无论子组件嵌套多深，这个modal能够和root同一级。使用chrome检查dom结构，就可以看到下面结构
![](https://imgkr2.cn-bj.ufileos.com/b983b8aa-5b18-48e2-8567-175462f6eacc.png?UCloudPublicKey=TOKEN_8d8b72be-579a-4e83-bfd0-5f6ce1546f13&Signature=WlPzs6P21wTCqv2dVpG555EqJ60%253D&Expires=1604809484)


# 使用Portal的注意点
在使用Portal的时候，需要知道就是虽然Portal可以被放置到DOM树的任何地方，但是行为和普通的React组件行为一致。由于 portal 仍存在于 React 树， 且与 DOM 树 中的位置无关，那么无论其子节点是否是 portal，像 context 这样的功能特性都是不变的。  
下面是总结的一些注意事项。
1. 事件冒泡: 一个从 portal 内部触发的事件会一直冒泡至包含 React 树的祖先，即便这些元素并不是 DOM 树 中的祖先。
2. 生命周期: 即使是通过Portal创建的元素，这个元素仍然具有他的生命周期如`componentDidMount`等等
3. 影响范围: Portal只会影响HTML的结构不会影响React树结构
4. 挂载节点: 当使用Portal的时候必须定义一个真实的DOM节点作为Portal组件的挂载入口

# 总结
当我们需要在正常的DOM结构之外呈现子组件时，React Portal非常有用，而不需要通过React组件树层次结构破坏事件传播的默认行为，这在在渲染例如弹窗、提示非常有用

> 欢迎关注「前端好好学」，前端学习不迷路或加微信 ssdwbobo，一起交流学习
