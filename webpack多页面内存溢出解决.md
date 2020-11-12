因为自己的项目是基于`vue-cli3`进行开发，所以这里只讨论这种情况下的解决办法 
在进行多页面开发的时候，项目刚开始阶段，页面较少，编译速度还能忍受，但是一旦页面增加，多次热更新就造成了内存溢出。

![](https://user-gold-cdn.xitu.io/2019/10/22/16df2a3190505b06?w=916&h=216&f=png&s=27386)
## 原因
这里需要借助一个插件来进行性能分析`webpack-bundle-analyzer`，在`vue.config.js`中添加以下代码
```js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
configureWebpack: {
 plugins: [
    new BundleAnalyzerPlugin(),
 ],
}
```
下面是自己项目编译的截图
![](https://user-gold-cdn.xitu.io/2019/10/22/16df2af688c8e455?w=298&h=546&f=png&s=74106)

![](https://user-gold-cdn.xitu.io/2019/10/22/16df2c0b384f2957?w=500&h=97&f=png&s=8376)
可以看到的是`webpack`把所有的页面都进行了编译，总体积已经达到了`18M`，耗时超过1分钟，在热更新的时候这个体积会变得更大，从而占据`node`的运行内存，导致内存溢出。但是一般在开发的时候，我们一次更改的页面可能就只有几个，所以编译这些多余的页面是没有必要的。那下面就是多种解决方案

下面就是几种尝试的方法，加快编译的速度
## 增加`Node`运行内存
在上面提到在热更新的时候，热更新的代码会大量占据`node`分配的内存，导致内存溢出。那么第一种方式，尝试增加`node`的运行内存。在`Node`中通过`JavaScript`使用内存时只能使用部分内存（`64`位系统下约为`1.4 GB`，`32`位系统下约为`0.7 GB`）。所以不管电脑实际的运行内存是多少，`Node`在运行代码编译的时候，使用内存大小不会发生变化。这样就可能导致因为原有的内存不够，导致内存溢出。下面给出两种方案
### 更改`cmd`
在`node_modules/.bin/vue-cli-server.cmd`把下面代码复制上去
```cmd
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" --max_old_space_size=4096 "%~dp0\..\@vue\cli-service\bin\vue-cli-service.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node --max_old_space_size=4096  "%~dp0\..\@vue\cli-service\bin\vue-cli-service.js" %*
)
```
### 更改`package.json`
把启动`Node`服务的更改下：
```cmd
node --max_old_space_size=4096 node_modules/@vue/cli-service/bin/vue-cli-service.js serve
```
本质上没什么区别，都是增加`Node`分配的内存，在这里把`node`的运行内存提高到`4g`就能够让`webpack`热编译的时候不会内存溢出。使用这种方法，确实是没有在出现内存溢出的情况。但是在首次启动和热编译的时候，速度并没有发生质的提升，首次编译还是达到了1分钟这种难以忍受的速度。如果项目进一步扩大，难道我们需要再次增加`node`的运行内存？

## 过滤编译页面
在上面截图中可以看到，在编译的时候`webpack`编译了一些不必要的页面，本来我们只需要调试`A`页面，但是`webpack`把所有的页面都进行了编译，某些页面我们可能并不需要，那这里就提出一种思路，对需要调试的页面进行过滤。
下面是多页面的配置：
```js
// page.config.js
module.exports = {
    index: {
        entry: 'src/page/index/main.js', // 页面入口
        template: 'public/index.html', // 页面模板路径
        filename: 'index.html' // 输出文件名
        title: '页面title',
    }
}
// vue.config.js
const pages = require('./page.config.js')
module.expors = {
    pages,
}
```
可以看到的是传统的方案是把多页面的配置全部引入，进行编译，所以这里就提出一种解决方案，对多页面进行过滤，得到我们需要的编译页面，下面是过滤的脚本：
```js
const path = require('path');
const fs = require('fs');
const pages = require('../pages.config');

const params = JSON.parse(process.env.npm_config_argv).original;
const buildPath = params[params.length - 1].match(/[a-zA-Z0-9]+/)[0] || '';

let buildConfig = {
  pages: [],
};


if (!/(test|online|serve)/gi.test(buildPath)) {
  const configJsPath = path.resolve(__dirname, `${buildPath}.js`);

  // 如果该路径存在
  if (fs.existsSync(configJsPath)) {
    // eslint-disable-next-line import/no-dynamic-require
    buildConfig = require(configJsPath);
  } else if (pages[buildPath]) {
    buildConfig.pages = buildPath.split(',');
  } else {
    throw new Error('该路径不存在');
  }
} else {
  buildConfig = require('./default');
}
const buildPages = {};
buildConfig.pages.forEach((name) => {
  buildPages[name] = pages[name];
});
module.exports = buildPages;
```
这样就可以单独单独编译我们所需要的页面下面是`default.js`的内容:
```js
module.exports = {
    pages: ['ugcDetail']
}
```
这个文件中`pages`就是我们需要编译的文章，现在`webpack`就过滤了不需要编译的页面，下面是页面编译速度的截图: 
![](https://user-gold-cdn.xitu.io/2019/10/23/16df65edb2d81e84?w=511&h=81&f=png&s=8101)
页面的编译速度提高了惊人的`10`倍，因为需要编译的文件少了，所以运行速度也就提高了不少。一般情况下，一个人是负责单独的业务线，别人的代码我们也不需要干涉，所以也能实现一次配置，多次运行的效果。但是有的时候我们也需要更改别人的代码，不能说又加一个配置文件，下面就是借助`webpack`自带的钩子实现编译指定文件。
## 使用`webbpack-dev-serve`钩子进行单独编译
在上面`page.config.js`中可以看到每个单页面都有一个入口文件，`webpack`借助这些入口文件进行对每个页面进行单独编译，每个页面编译后的`js`混合到一起也就非常大了，那我们能不能让这些入口文件暂时变成一个空文件，如果需要编译这个页面，在空文件中引入需要编译的入口文件。也就是所有的入口文件都变成了一个空的`js`文件，如果需要编译这个页面，在通过
```j
import 入口
```
实现单独的页面文件编译。那`webpack`是如何知道我们需要编译的页面呢，在`webpack-dev-serve`中，有一个钩子`before`，在访问页面的时候我们能够拿到页面信息的路径，下面是实现：
```js
// vue.config.js
const compiledPages = [];
before(app) {
      app.get('*.html', (req, res, next) => {
        const result = req.url.match(/[^/]+?(?=\.)/);
        const pageName = result && result[0];
        const pagesName = Object.keys(multiPageConfig);

        if (pageName) {
          if (pagesName.includes(pageName)) {
            if (!compiledPages.includes(pageName)) {
              const page = multiPageConfig[pageName];
              fs.writeFileSync(`dev-entries/${pageName}.js`, `import '../${page.tempEntry}'; // eslint-disable-line`);
              compiledPages.push(pageName);
            }
          } else {
            // 没这个入口
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end('<p style="font-size: 50px;">不存在的入口</p>');
          }
        }
        next();
      });
    },
```
多页面配置中以下配置，需要先把入口路径，先缓存起来，然后置空，下面是具体实现
```js
{
    pageName: {
        entry: entryPath,
        chunks: [array]
    }
}
const fs = require('fs');
const util = require('util');

const outputFile = util.promisify(fs.writeFile);
async function main() {
  const tasks = [];
  if (!fs.existsSync('dev-entries')) {
    fs.mkdirSync('dev-entries');
  }
  Object.keys(pages).forEach((key) => {
    const entry = `dev-entries/${key}.js`;
    pages[key].tempEntry = pages[key].entry; // 暂存真正的入口文件地址
    pages[key].entry = entry;
    tasks.push(outputFile(entry, ''));
  });
  await Promise.all(tasks);
}

if (process.env.NODE_ENV === 'development') {
  main();
}

module.exports = pages;
```
这种方法就是把所有页面入口文件置为空文件，虽然编译了所有的页面但是所有的文件都是空的，所以大大的减少了首次编译的文件大小。
![](https://user-gold-cdn.xitu.io/2019/10/23/16df7e521b36213a?w=365&h=165&f=png&s=15925)

![](https://user-gold-cdn.xitu.io/2019/10/23/16df7e6ed632cbc0?w=477&h=69&f=png&s=6951)
速度也从原来的`80`多秒，降低到了`8s`。然后当我们访问某个页面的页面，执行到`before`钩子，进行单独编译，速度也是非常快的。

## 升级`html-webpack-plugin`版本
多页面出现内存溢出的问题是因为在编译的时候，实际是一次更改，编译了多个文件，这是`html-webpack-plugin`的问题。因为没生成一个页面，就需要调用一下`new htmlWebpackPlugin()`，多个页面的时候内存就不够用了。所以改一下这个这个`webpack`插件的版本,升级到`4.0.0-beta.8`这个版本。然后再`vue.config.js`中添加下面的配置，这样也不会造成内存溢出。
```js
const htmlPlugins = [];
Object.keys(multiPageConfig).forEach((key) => {
    htmlPlugins.push(multiPageConfig[key])
})
configureWebpack: {
    plugins: [
      ...htmlPlugins,
    ],
}
```

## 其他加快编译的技巧
`webpack`的插件还是很方便的，网上有啥`happypack`类似的插件。由于运行在 Node.js 之上的 Webpack 是单线程模型的，所以`Webpack`需要处理的事情需要一件一件的做，不能多件事一起做。
我们需要`Webpack`能同一时间处理多个任务，发挥多核`CPU`电脑的威力，`HappyPack`就能让`Webpack` 做到这点，它把任务分解给多个子进程去并发的执行，子进程处理完后再把结果发送给主进程。可能是我电脑太烂了，装上没啥太大的提升，具体使用方法可以参照这篇文章[webpack优化之HappyPack 实战](https://www.jianshu.com/p/b9bf995f3712)。还有一些细节的地方比如说有些包需要加入编译，但是一般我们在调试的时候只需要在`chrome`上进行调试，开发环境就不用加入编译，多处使用的代码单独打包，这些也就不说了，大家多多尝试

这几种解决多页面内存溢出的方法各有优缺点，读者可根据自己的项目自行决定使用哪种方法，可能有时还需要多种方式组合使用，就看看那个好使好用了。  
推销一波自己的[github](https://github.com/skychenbo/Blog)最近在抓紧学习，会持续更新文章，希望大家多多关注。

