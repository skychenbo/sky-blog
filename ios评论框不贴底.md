结构如下
![](https://user-gold-cdn.xitu.io/2019/2/18/1690043e15995970?w=640&h=960&f=png&s=14582)

我们需要做的就是当聚焦评论框的时候，`ios`需要让键盘顶起评论框。在`ios`系统中，当键盘弹起的时候，会挤压页面，评论框会自然在顶部，但是有个问题就是，下面的评论框会不贴底，露出下面的东西，所以在`ios12`之前的解决办法就是在评论框触发`focus`的时候让页面滚动到底部，代码如下：
```javaScript
const body = document.dcumentElement.scrollTop ? document.documentELement : document.body;
const {scrollHeight, scrollTop} = body;
const innerHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
body.scrollTop = scrollHeight - innerHeight;
```
如果输入框失去焦点，就让页面滚动到先前的位置。
代码如下：
```javaScript
body.scrollTop = scrollTop; // 滚动到先前的位置
```

这种方案在`ios12`上会出现两个问题：
<ul>
 <li>如果在页面底部吊起输入框，输入框会被键盘挡住</li>
 <li>如果在页面中部，行为会变得很奇怪，即使我们用了上面的方法，输入框会不贴底，众所周知在输入的时候，fixed定位会生效，即使我们禁用了touchmove事件，还是能够滚动</li>
</ul>
所以针对这些问题，我先试了网上这种据说通用的解决方法:
`scrollIntoView`这种方法，但是报错了，没有这个方法。

然后我自己分析了一下这个问题，出现各种情况的原因是因为弹出键盘时，页面能够滚动，于是就出现了各种问题，那干脆让页面无法滚动。`ios11`及之前使用了下面的布局：
```css
.parent {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: 0;
}
```
并且禁止了`touchmove`事件，这样能够让页面无法滚动，但是`ios12`并没有什么卵用。还是能够滚动，那咱们就让内容就一屏，多的被截掉。下面是输入框`focus`的代码：
```javaScript
const {scrollHeight,scrollTop} = body;
const innerHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
body.style.height = `${innerHeight}px`;
body.style.overflow = 'hidden';
```
然后就是输入框触发`blur`事件时的代码：
```javaScript
body.style.height = `${scrollHeight}px`;
body.style.overflow = 'auto';
body.style.scrollTop = scrollTop;
```
在这里需要重新设置`body`的高度，高度为之前获取的`scrollHeight`，因为我们需要重新滚动到先前的位置，建议不要设置`height`为`auto`,因为在一些场景下我们可能需要监听滚动事件，会出现其他的问题(稳战稳打才能打胜仗)。然后重新设置`body`的`overflow`,让页面能够滚动，最后滚动到先前的位置。