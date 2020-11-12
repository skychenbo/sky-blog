`Deno`是`Ryan Dahl`在`2017`年创立的，此外
`Ryan Dahl`也是`Node.js`的创始人，从`2007`年一直到`2012`年，他后来把 `Node.js` 移交给了其他开发者，不再过问了，转而研究人工智能。  
他始终不是很喜欢 `Python` 语言，久而久之，就想搞一个 `JavaScript` 语言的人工智能开发框架。等到他再回过头捡起 `Node.js`，发现这个项目已经背离了他的初衷，有一些无法忽视的问题，从此`deno`从此应运而生。  
下面我们来看看`Deno`的基本使用，并用它构建一个简单的聊天网站。
# 安装Deno
有很多种方式安装`Deno`，具体如何安装可参考这篇文章[deno安装](https://github.com/denoland/deno/blob/34ec3b225425cecdccf754fbc87f4a8f3728890d/docs/getting_started/installation.md)。   
我使用Homebrew安装Deno(感觉这种方式要快一点)
```sh
brew install deno
deno 1.4.6
v8 8.7.220.3
typescript 4.0.3
```
可以看到的是`deno`依赖中不存在`npm`，`npm`是`node`的包管理工具。`deno`舍弃了`npm`使用了另外的方式进行包的管理。 

# Hello world
了解一门语言，国际惯例，先上`Hello World`。  
首先创建一个文件，这个文件可以是`js`文件也可以是`ts`文件，`Deno`内置对`ts`的支持，不需要使用`typescript`对`ts`文件在进行编译一遍(因为作者对`ts`不怎么熟悉，所以文章使用`js`进行编写)。运行这个文件调用`deno run [file]`。
下面是实例代码
```js
// example.js
console.log("Hello World")
```
执行`deno run example.js`，下面是打印结果
```sh
deno run example.js
Hello world
```
如果我们使用`ts`格式，可以自己定义`tsconfig.json`文件，然后使用`deno run -c tsconfig.json example.ts`来覆盖deno内置的ts配置，deno内部的默认配置可参考[Using Typescript](https://deno.land/manual@v1.5.1/getting_started/typescript)

# 创建http服务
`node`中使用`import path from 'path'`的方式引入库或者工具，`deno`因为没有`npm`的概念，如果需要引入某个库，直接从`url`中获取需要的工具就可以，这样做的是为了尽可能的减少包文件的体积。  
例如创建一个`http server`我们需要使用`deno`的`http`服务: `https://deno.land/std/http/`，`deno`所有的标准库都在`https://deno.land/std` 。
首先创建两个文件，一个用服务端代码，一个客户端代码: `server.js`和`static/index.html`
下面是`index.html`的内容
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta charset="utf-8" />
    <title>Example using Deno</title>
  </head>
  <body>index.html</body>
</html>
```
server.js
```js
import { listenAndServe } from 'https://deno.land/std/http/server.ts';
const file_url = fromFileUrl(new URL('../static/index.html', import.meta.url));
listenAndServe(
  {
    port: 3000,
  },
  async req => {
    if (req.method === 'GET' && req.url === '/') {
      req.respond({
        status: 200,
        headers: new Headers({
          'content-type': 'text/html',
        }),
        body: await Deno.readTextFile(file_url),
      });
    }
  }
);

console.log('Server running on localhost:3000');

```
在`deno`中可以使用`ESModules`的模块方式代替`Common.js`。需要注意的是在引入文件的时候必须要加上文件后缀名，例如引入文件`a`，必须写`a.js`。此外，相对于`node``deno`默认支持`async-await`。  
当我们运行`deno run server.js`，可以看到和先前的`Hello World`例子有两个地方差异.
1. 使用`http`的方式引入依赖，而不是`npm`或者`yarn`的方式。在执行文件之前，`deno`会首先下载所有的依赖放入缓存，当我们不清空缓存的时候可以尝试`--reload`命令
2. 执行的时候会抛出两个错误，一个是没有权限接入网络`Uncaught PermissionDenied: network access to "0.0.0.0:3000"`, 这个可以添加`--allow-net`表示运行网络访问，在访问`localhost:3000`，`deno`抛出错误`Uncaught PermissionDenied: read access to`无法读取文件。这里也是和`node`有差异的地方，大多数情况下`node`可以不需要用户的同意获取网络文件等权限。`deno`基于安全考虑限制了大量的权限，如果需要读取某个文件夹的内容需要使用`deno --allow-read=文件目录`。更多命令可参考`deno run -h`
执行下面命令就可以启动`http`服务，并且访问到`index.html`的内容
```sh
deno run --allow-net --allow-read server.js
Server running on localhost:3000
```
# 创建聊天应用
下面来创建一个简单的聊天应用，主要实现的功能：
1. 客户端1发送消息
2. 服务端收到消息后，主动推送消息给客户端2
2. 客户端2立刻收到消息并显示
下面是服务端代码的具体实现，首先创建一个`chat.js`, 这个文件主要是用于存储`websocket`实例，接受客户端发送的消息，主动向客户端发送消息，下面是具体实现:
```js
import { isWebSocketCloseEvent } from 'https://deno.land/std/ws/mod.ts';
import { v4 } from 'https://deno.land/std/uuid/mod.ts';

const users = new Map();

function broadcast(message, senderId) {
  if (!message) {
    return false;
  }
  users.forEach(user => {
    user.send(senderId ? `[${senderId}]: ${message}` : message);
  });
}

export async function chat(ws) {
  const userId = v4.generate();

  users.set(userId, ws);
  broadcast(`> User with the id ${userId} is connected`);
  for await (const event of ws) {
    const message = typeof event === 'string' ? event : '';

    broadcast(message, userId);

    if (!message && isWebSocketCloseEvent(event)) {
      users.delete(userId);
      broadcast(`> User with the id ${userId} is disconnected`);
      break;
    }
  }
}

```
然后在server.js中定义路由，用于处理websocket请求
```js
import { listenAndServe } from "https://deno.land/std/http/server.ts";
import { acceptWebSocket, acceptable } from "https://deno.land/std/ws/mod.ts";
import { chat } from "./chat.js";

listenAndServe({ port: 3000 }, async (req) => {
  if (req.method === "GET" && req.url === "/") {
    req.respond({
      status: 200,
      headers: new Headers({
        "content-type": "text/html",
      }),
      body: await Deno.open("./index.html"),
    });
  }

  // WebSockets Chat
  if (req.method === "GET" && req.url === "/ws") {
    if (acceptable(req)) {
      acceptWebSocket({
        conn: req.conn,
        bufReader: req.r,
        bufWriter: req.w,
        headers: req.headers,
      }).then(chat);
    }
  }
});

console.log("Server running on localhost:3000");
```
下面是客户端的代码，这里为了简单实用`preact`，他不需要额外的`babel`、`webpack`配置实用非常的方便。
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Example using Demo</title>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { html, render, useEffect, useState } from 'https://unpkg.com/htm/preact/standalone.module.js';

    let ws;

    function Chat() {
      const [messages, setMessages] = useState([]);
      const onReceiveMessage = ({ data }) => setMessages(m => [...m, data]);
      const onSendMessage = e => {
        const msg = e.target[0].value;

        e.preventDefault();
        console.log(msg);
        ws.send(msg);
        e.target[0].value = '';
      };

      useEffect(() => {
        if (ws) {
          ws.close();
        }
        ws = new WebSocket(`ws://${window.location.host}/ws`);
        ws.addEventListener('message', onReceiveMessage);
        return () => {
          ws.removeEventListener('message', onReceiveMessage);
        };
      }, []);
      return html`
        ${messages.map(message => html` <div>${message}</div> `)}

        <form onSubmit=${onSendMessage}>
          <input type="text" />
          <button>Send</button>
        </form>
      `;
    }
    render(html`<${Chat} />`, document.getElementById('app'));

  </script>
</body>
</html>
```
![](//p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9b5b0cb175d0464b821eb66da12c773e~tplv-k3u1fbpfcp-zoom-1.image)

# 第三方库的管理
上面例子中主要实用了`deno`的标准库，下面是`deno`的第三方库的使用，引入第三方库也是通过`url`的方式来引入。官网主要包含了标准库和第三方库，下面是具体的地址
- 标准库: https://deno.land/std/
- 第三方库: https://deno.land/x/
但是，官网上的第三放库实在是太少了不能满足我们的需求。好消息是我们可以使用`https://www.pika.dev`上面的库，此外可以通过打包工具如`Parcel`把`node`包转换成`deno`能够使用的包。
下面借助`camel-case`将用户输入的输入内容转为驼峰式，添加以下代码到`chat.js`中
```js
import { camelCase } from 'https://cdn.pika.dev/camel-case@^4.1.1';
// ...before code
const message = camelCase(typeof event === 'string' ? event : '')
// ... before code
```
重新运行一次，可以看到更改的内容已经生效了。  
![](//p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6aa97bab392e45c69a09d34e871e0530~tplv-k3u1fbpfcp-zoom-1.image)
但是上面这种方式存在一个问题，如果多个文件都依赖了`camelCase`，每个文件需要声明一个`url`。当升级`camel-case`的时候，需要把所有依赖当前库的版本号都更改一下，很可能漏掉出现一些问题。所以推荐对于引入的第三方库可以在一个文件中进行管理，如下:
```js
//deps.js
export { camelCase } from 'https://cdn.pika.dev/camel-case@^4.1.1';
// chat.js
import { camelCase } from './deps.ts';
```
# 编写测试
`Deno`相对于`node`内置了非常多的功能，例如自动生成文档，代码格式化，自动测试等等。 
例如现在创建一个函数用于统计字符串中一个有多少个大写字母
```js
/**
 * 统计字符串的大写字母的个数
 */
export function camelize(text) {
  // todo:
}
```
执行下面命令`deno doc camelize`，就可以生成当前函数的文档
```sh
deno doc camelize
function camelize(text)
  统计字符串的大写字母的个数
```
然后创建一个测试文件`test.js`，用于测试当前函数是否符合要求。  
`Deno`内置了一些测试的工具如`Deno.test`，断言等等，下面是`test.js`的内容
```js
import { assertStrictEq } from "https://deno.land/std/testing/asserts.ts";
import { camelize } from "./camelize.js";

Deno.test("camelize works", async () => {
  assertStrictEq(camelize("AAbbCC"), 4);
});
```
然后执行`deno test`发现有以下报错
```sh
running 1 tests
test camelize works ... FAILED (2ms)

failures:

camelize works
AssertionError: Values are not strictly equal:


    [Diff] Actual / Expected


-   undefined
+   4

    at assertStrictEquals (asserts.ts:298:9)
    at file:///Users/cornelius/deno-chart/test.js:5:3
    at asyncOpSanitizer (deno:cli/rt/40_testing.js:34:13)
    at Object.resourceSanitizer [as fn] (deno:cli/rt/40_testing.js:68:13)
    at TestRunner.[Symbol.asyncIterator] (deno:cli/rt/40_testing.js:240:24)
    at AsyncGenerator.next (<anonymous>)
    at Object.runTests (deno:cli/rt/40_testing.js:317:22)

failures:

        camelize works

test result: FAILED. 0 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out (2ms)
```


可以看到咱们的测试是没有通过的，下面更改`camelize`中的代码
```js
export function camelize(text) {
  return (text.match(/[A-Z]/g) || []).length;
}
```
再次执行`deno test`，可以看到通过了测试
```sh
running 1 tests
test camelize works ... ok (4ms)

test result: ok. 1 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out (4ms)
```

# Debugging
除了`console`，借助`chrome`还能够进行断点调试。
1. 首先在启动命令中添加`--inspect-brk`例如`deno run --inspect-brk camelize.js`执行后会在`9229`端口启动一个`websocket`
2. 在`chrome://inspect`中添加一个端口如: `localhost:9229`
3. 点击`inspect`就可以调试`deno`代码了
4. 调试代码就和正常的调试一样就可以了


> 欢迎关注「前端好好学」，前端学习不迷路或加微信 ssdwbobo，一起交流学习
