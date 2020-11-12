在这篇文章中，主要讲如何在不借助第三方库的情况只实现Notifaction

# 需求分析
参考Ant-Design的Notification，期望我们实现的组件有以下功能:
1. 具有四种风格: info(蓝色),success(绿色)，warning(橘黄色)和error(红色)
2. notification被定位在屏幕的右上角
3. 在添加和移除的时候都有过场动画。当某个notication被删除时，其他的应该垂直滑动
4. 可以创建10秒后关闭的通知
5. 能够在jsx中以`<Notification color="success" />`方式调用
6. 也可以通过函数的方式进行调用例如`success()`

# 前置工作
这里使用`create-react-app`来创建工程，然后使用`css module`来写样式。
下面是具体的代码
```sh
create-react-app notify --template typescript
```
在ts中使用css module需要单独配置一下，先安装`typescript-plugin-css-modules`
```sh
yarn add -D typescript-plugin-css-modules
```
然后在tsconfig.json中添加以下配置
```json
{
  "compilerOptioins": {
    "plugins": [
      {
        "name": "typescript-plugin-css-modules"
      }
    ]
  }
}
```
最后还需要在`src/types`目录下添加`global.d.ts`
```ts
declare module "*.module.scss" {
  const classes: {[key: string]: string}
  export default classes;
}
```
下面是对应的目录结构
```

- notify
  - Notification
    - index.module.scss
    - index.tsx
    - times.svg
  - createContainer
    - index.module.scss
    - index.tsx
  - index.ts
```

# Notification Component
下面是核心的notifcation的代码
```tsx
// notify/Notification/index.js
import React from 'react'
import cn from 'classnames'

import { ReactComponent as Times } from './times.svg'
import styles from './index.module.scss'

export enum Color {
  info = 'info',
  success = 'success',
  warning = 'warning',
  error = 'error',
}

export interface NotificatonProps {
  color?: Color;
}

const Notification: React.FC<NotificatonProps> = ({color = Color.info, children}) {
  return (
    <div className={cn([styles.notification, styles[color]])}>
      {children}
      <button className={styles.closeButton}>
        <Times height={16} />
      </button>
    </div>
  )
}
export default Notification
```
目前这个Notification接收两个props:
- color: 决定当前的notification的背景颜色，有四种可选值: info、success、warning、error
- children: 可以在Notification中渲染的React Element
下面是他的具体样式:
```scss
.notification {
  max-width: 430px;
  max-height: 200px;
  overflow: hidden;
  padding: 12px 48px 12px 12px;
  z-index: 99;
  font-weight: bold;
  position: relative;
  color: #fff;

  .closeButton {
    position: absolute;
    top: 50%;
    right: 12px;
    height: 16px;
    transform: translateY(-50%);
    background: transparent;
    padding: 0;
    border: none;
    cursor: pointer;
    color: #fff;
    outline: none;
  }

  &:not(:last-child) {
    margin-bottom: 8px;
  }

  &.info {
    background-color: #2196f3;
  }

  &.success {
    background-color: #4caf50;
  }

  &.warning {
    background-color: #ff9800;
  }

  &.error {
    background-color: #f44336;
  }
}
```
# 在DOM中渲染Notification
在业务中使用notification的时候，我们期望这个notfication不会受父元素样式的影响，所以这里使用react portals来脱离dom树，但是不脱离react树，具体可参考[你真的了解React Portals吗](https://juejin.im/post/6892951045685641224)

`createContainer`是用于创建notification的容器然后将其添加到body中:
```js
// notify/createContainer/index.js
import styles from './index.module.scss'

export default function createContainer() {
  export default function createContainer(): Element {
  const portaId = "notifyContainer";

  let element = document.querySelector(`#${portaId}`)

  if (element) {
    return element;
  }

  element = document.createElement('div');
  element.setAttribute('id', portaId);
  element.className = styles.container;
  document.body.appendChild(element);
  return element;
}
```
下面是`container`的样式
```css
.container {
  position: fixed;
  top: 16px;
  right: 16px;
}
```
然后修改`notification`组件，把它渲染在我们创建的容器中
```jsx
const container = createContainer();

const Notification: React.FC<NotificatonProps> = ({color = Color.info, children}) => {
  return createPortal(
    <div className={cn([styles.notification, styles[color]])}>
      {children}
      <button className={styles.closeButton}>
        <Times height={16} />
      </button>
    </div>,
    container
  )
}

```
# Demo
在编写demo之前，把Notification和类型定义暴露出去，具体如下:
```ts
export Notification, { Color } from './Notification'
```
接下来写一个demo来看各种模式的notificaiton
```tsx
import React, { useState } from 'react';
import { Notification, Color } from './notify';
import './App.css';

interface NoteInterface {
  id: number;
  color?: Color;
}

function App() {
  const [notifications, setNotifications] = useState<NoteInterface[]>([]);
  const createNotification = (color: Color) => {
    setNotifications([
      ...notifications,
      {
        color,
        id: notifications.length,
      },
    ]);
  };

  return (
    <div className="App">
      <h1>Notification Demo</h1>
      <button onClick={() => createNotification(Color.info)}>Info</button>
      <button onClick={() => createNotification(Color.success)}>Success</button>
      <button onClick={() => createNotification(Color.warning)}>Warning</button>
      <button onClick={() => createNotification(Color.error)}>Error</button>
      {notifications.map(({ id, color }) => {
        <Notification key={id} color={color} />;
      })}
    </div>
  );
}

export default App;
```
在demo中展示了四种不同主题的notification


# 关闭Notification
接下来给notification的关闭按钮添加事件用于主动关闭notification:
```tsx
interface NotificatonProps {
  color?: Color,
  onDelete: Function,
}

const Notification: React.FC<NotificatonProps> = ({ color = Color.info, children, onDelete }) =>
  createPortal(
    <div className={cn([styles.notification, styles[color]])}>
      {children}
      <button onClick={() => onDelete()} className={styles.closeButton}>
        <Times height={16} />
      </button>
    </div>,
    container
  );

export default Notification;
```
然后在`App.tsx`中添加`onDelete`函数用于关闭`notification`:
```tsx
function App() {
  const [notifications, setNotifications] = useState<NoteInterface[]>([]);
  const createNotification = (color: Color) => {
    setNotifications([
      ...notifications,
      {
        color,
        id: notifications.length,
      },
    ]);
  };

  const deleteNotification = (id: number) =>
    setNotifications(notifications.filter(notification => notification.id !== id));

  return (
    <div className="App">
      <h1>Notification Demo</h1>
      <button onClick={() => createNotification(Color.info)}>Info</button>
      <button onClick={() => createNotification(Color.success)}>Success</button>
      <button onClick={() => createNotification(Color.warning)}>Warning</button>
      <button onClick={() => createNotification(Color.error)}>Error</button>
      {notifications.map(({ id, color }) => (
        <Notification onDelete={() => deleteNotification(id)} key={id} color={color}>
          This is Notification
        </Notification>
      ))}
    </div>
  );
}
```
# 添加渐入渐出动画
在上面notification无论是添加还是删除，动效都非常僵硬。下面添加渐入渐出动画，让这个添加删除过程更加平滑提供用户体验。

在添加动画中，让组件位置从translateX(100%)移动到`translateX(0%)`。

下面是使用keyframes的动画代码:
```css
// notify/Notification/index.module.scss
@keyframes slideIn {
  from {
    transform: translateX(100%)
  }
  to {
    transform: translateX(0)
  }
}

.notification {
  &.slideIn {
    animation-name: slideIn;
    animation-duration: 0.3s;
    animation-timing-function: ease-in-out;
  }
}
```
移除动画有点棘手，因为如果在关闭的时候如果立即删除DOM，那么在transition是不会生效的。所以当点击删除的时候，添加300ms的延迟，元素从translateX(0%)到translateX(150%)

下面是移除动画的效果css
```css
// notify/Notification/index.module.scss
.notification {
  transition: transform .3s ease-out;

  &.slideOut {
    transform: translateX(150%);
    flex: 0;
  }
}
```
为了实现关闭的阶段，在组件中我们需要添加一个状态值`isClosing`，默认是false。当我们点击关闭按钮的时候，把isClosing为true，动画结束以后再调用onDelete函数

需要注意在没有关闭的阶段的时候我们只能使用slideIn动画，当在关闭的时候使用slideOut动画
```tsx
const Notification: React.FC<NotificatonProps> = ({ color = Color.info, autoClose = false, children, onDelete }) => {
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    if (isClosing) {
      const timerId = setTimeout(() => setIsClosing(true), timeToDelete);
      return (): void => {
        clearTimeout(timerId);
      };
    }
  }, [isClosing, onDelete]);
  return createPortal(
    <div
      className={cn([
        styles.notification,
        styles[color],
        {
          [styles.slideIn]: !isClosing,
          [styles.slideOut]: isClosing,
        },
      ])}
    >
      {children}
      <button type="button" onClick={(): void => setIsClosing(true)} className={styles.closeButton}>
        <Times height={16} />
      </button>
    </div>,
    container
  );
};
```
# 移除动画
当一个notification被移除的时候，下一个的notification需要移动到被删除的notification的位置

为了让这个过程更加顺畅，在关闭阶段给组件添加一个容器用于让收缩更加顺畅
```tsx
const Notification: React.FC<NotificatonProps> = ({ color = Color.info, autoClose = false, children, onDelete }) => {
  const [isClosing, setIsClosing] = useState(false);
  useEffect(() => {
    if (isClosing) {
      const timerId = setTimeout(() => setIsClosing(true), timeToDelete);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [isClosing, onDelete]);
  return createPortal(
    <div
      className={cn([
        styles.container,
        {
          [styles.shrink]: isClosing,
        },
      ])}
    >
      <div
        className={cn([
          styles.notification,
          styles[color],
          {
            [styles.slideIn]: !isClosing,
            [styles.slideOut]: isClosing,
          },
        ])}
      >
        {children}
        <button type="button" onClick={(): void => setIsClosing(true)} className={styles.closeButton}>
          <Times height={16} />
        </button>
      </div>
    </div>,
    container
  );
};
```
这个容器默认max-height为200px然后在移除阶段自动收缩为0px。然后在不同容器之间添加一定的距离:
```css
.container {
  overflow: hidden;
  max-height: 200px;
  transition: max-height .3s ease-out;

  &:not(:last-child) {
    margin-bottom: 8px;
  }

  &.shrink {
    max-height: 0;
  }
}
```
# 添加自动关闭功能
下面添加autoClose的props，使用useEffect监听autoClose的变化，当值发生变化时，10秒更改isClosing为true
```tsx
const timeToClose = 10 * 1000;
 useEffect(() => {
    if (autoClose) {
      const timerId = setTimeout(() => setIsClosing(true), timeToClose);
      return () => {
        clearTimeout(timerId);
      };
    }
  }, [autoClose]);
```
然后在demo测试一下autoClose
```tsx
function App() {
  const [notifications, setNotifications] = React.useState([]);

  const createNotification = (color) =>
    setNotifications([...notifications, { color, id: notifications.length }]);

  const deleteNotification = (id) =>
    setNotifications(
      notifications.filter((notification) => notification.id !== id)
    );

  return (
    <div className="App">
      <h1>Notification Demo</h1>
      <button onClick={() => createNotification(Color.info)}>Info</button>
      <button onClick={() => createNotification(Color.success)}>Success</button>
      <button onClick={() => createNotification(Color.warning)}>Warning</button>
      <button onClick={() => createNotification(Color.error)}>Error</button>
      {notifications.map(({ id, color }) => (
        <Notification
          key={id}
          onDelete={() => deleteNotification(id)}
          color={color}
          autoClose={true}
        >
          This is a notification!
        </Notification>
      ))}
    </div>
  );
}
```

# 函数方式调用notification
下面添加函数方式调用notificaiton，例如`success()`或者`error()`

实现这个效果还是需要把组件渲染在DOM中，但是需要对Notification进行二次封装。

下面创建NotificationsManager来满足这个需求
```tsx
import React, { useEffect } from 'react';

import Notification, { NotificatonProps } from './notification';

interface Props {
  setNotify(fn: (params: NotificatonProps) => void): void;
}

export default function NotificationsManager(props: Props) {
  const { setNotify } = props;
  const [notifications, setNotifications] = React.useState([]);

  const createNotification = ({ color, autoClose, children }): void => {
    setNotifications(prevNotifications => [
      ...prevNotifications,
      {
        children,
        color,
        autoClose,
        id: prevNotifications.length,
      },
    ]);
  };

  useEffect(() => {
    setNotify(({ color, autoClose, children }) => createNotification({ color, autoClose, children }));
  }, [setNotify]);

  const deleteNotification = (id: number): void => {
    const filteredNotifications = notifications.filter((_, index) => id !== index, []);
    setNotifications(filteredNotifications);
  };

  return (
    <template>
      {notifications.map(({ id, ...props }, index) => (
        <Notification key={id} onDelete={(): void => deleteNotification(index)} {...props} />
      ))}
    </template>
  );
}

```
在上述代码中，我们使用了notifications数组用来管理notification，遍历数组notifications生成组件。添加和删除实际上都是对这个数组进行操作。

这个函数接收一个函数setNotify，这个函数入参是一个函数这个函数用来添加notification组件入如createNotification。在命令式调用方式notification的时候，只要把这个暴露出去，就可以实现功能了。

下面是具体的代码
```tsx
// notify/index.tsx

import React from 'react';
import ReactDOM from 'react-dom';

import NotificationsManager from './NotificationsManager';
import Notification, { Color } from './notification';
import createContainer from './createContainer';

const containerElement = createContainer();

let notify;

ReactDOM.render(
  <NotificationsManager
    setNotify={(notifyFn): void => {
      notify = notifyFn;
    }}
  />,
  containerElement
);

export { Notification, Color };

export function info(children, autoClose): () => void {
  return notify({
    color: Color.info,
    children,
    autoClose,
  });
}
// ...
```
调用notification就可以用以下方式:
```js
info('message', true)
```


1. 如果觉得这篇文章还不错，来个分享、点赞、在看三连把，让更多人看到
2. 关注公众号「前端好好学」，每天推送新鲜干货好文，行业最新进展
3. 扫描下方添加微信，拉你进技术交流群和各大厂的同学一起学习进取
![](//p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9ff122e746f44598980a711d34a58abd~tplv-k3u1fbpfcp-zoom-1.image)
