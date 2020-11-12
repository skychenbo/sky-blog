这篇文章主要讲如何使用nodejs构建一个简易的区块链，技术栈基于js class和nodejs。 

一起来试试把，他比你想象中简单的多。

从10年前的一个学术概念到现在，区块链和数字货币技术高速发展，这种技术已经被各种行业广泛使用。

区块链技术正受到广泛关注，因为人们发现区块链本质上其实是一个分布式的，不可篡改的数据库，天生具有可验证、可信任的特性，它不但可用于支持比特币，也可用于数字身份验证，清算业务等传统的必须由第三方介入的业务，从而降低交易成本。

在以前，python是用于开发区块链的最主要的编程语言。然而随着区块链的快速发展，编写区块链的技术选型也多了起来，nodejs也可以用来编写区块链

在这篇文章中，我将讲解如何使用nodejs来构建区块链。这个区块链可能没有那么完美，但是足够让你明白这个区块链是如何工作的。

# 准备工作
准备内容很少，有以下内容你就可以开始开发这个区块链了
- 确保的环境安装了node.js
- 一个代码编辑器，例如vscode、sublime text

# 什么是区块链
区块链是一种类似于比特币以太坊的数字货币技术。它是一种创新的分布式公共账本，用于维护不断增长的记录列表(称为块)，这些记录使用加密技术安全的连接在一起。


区块链一词之所以得名，是因为它保存交易数据的方式，即在相互连接以创建链的区块中。区块链的规模随着交易数量的增加而增长。任何有效的交易数据都会登录到区块链网络中，区块链网络受参与者规定的点对点规则的约束。该数据包含区块的“价值”，例如数字货币、交易记录，或权利特权。

因为每个新块都应该指向上一个块，如果一个块被合并到链中而不包含上一个块的正确哈希，则可能会导致整个区块链无效。这种不变性是区块链安全性的关键

此外，为了保持区块链的真实性，经常会应用各种一致协议。一致性确保所有参与者都同意网络验证的交易。例如，一个常用的一致性协议是工作证明，它的目的是在完成一定量的计算工作后，识别出一个能解决复杂数学问题的数字。工作证明的主要思想是区块链网络中的任何参与者都能发现这个数字很难识别，但很容易验证。

在大多数加密货币的情况下，向区块链添加新区块需要求解一个复杂的数学方程，随着时间的推移，该方程式的难度会随着区块链的增长而增加。因此，任何通过解决这个问题来证明他们已经完成了工作的人都会得到一种数字货币的补偿，这个过程被称为“挖掘”。

# 如何创建一个区块
前面提到区块链是通过一个个区块相互链接而成的，此外前面也讲了区块的一些基本特性，下面开始实现一个区块

```js
const SHA256 = require('crypto-js/sha256')
class CryptoBlock {
  constructor(index, timestamp, data, precedingHash="") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.precedingHash = precedingHash;
    this.hash = this.computeHash();
  }
  computeHash() {
    return SHA256(this.index + this.precedingHash + this.timestamp + JSON.stringify(this.data)).toString()
  }
}
```
在上述代码中，创建了一个`CryptoBlock`类，然后在`contructor`声明了一些属性
| 属性名 | 含义 |
| --- | --- |
| index | 每个区块的在整个链中的位置 | 
| timestamp | 记录完成交易的时间 |
| data | 主要是交易的具体信息，例如发件人，票据等等 |
| precedingHash | 指向前一个区块的标识，这在维持区块链的完整性非常重要 |
此外，CryptoBlock有computeHash方法基于当前区块的一些属性来计算出来的一个hash值

在上面代码中，我导入了cryptojs库，然后使用了sha256用来计算每个block的hash值。sha256返回的是一个数字，然后使用toString()将其转换为字符串。

向你的库添加crpyto-js，需要在终端中执行下面命令
```js
npm i crypto-js
```

# 创建区块链
前面提到，区块链就是一个个区块顺序链接。所以下面来创建一个链表`CryptoBlockchain`来连接所有的区块。
这个CryptoBlockchain类需要多种辅助函数来完成不同的任务，例如创建一个区块并且把它添加到链中。
下面是区块的代码:
```js
class CryptoBlockchain{
  constructor() {
    this.blockchain = [this.startGenesisBlock()];
  }
  startGenesisBlock() {
    return new CryptoBlock(0, '01/01/2020', 'Initial Blcok in thc Chain', '0')
  }
  obtainLatestBlock() {
    return this.blockchain[this.blockchain.length - 1]
  }
  addNewBlock(newBlock) {
    newBlock.precedingHash = this.obtainLatestBlock().hash;
    newBlock.hash = newBlock.computedHash();
    this.blockchain.push(newBlock)
  }
}
```
下面讨论一下这个CrytoBlockchain这个类的辅助函数的作用:
## contructor
在contructor中创了一个blockchain属性，他是一个数组用来存储所有的区块。需要注意的，在contructor中，调用了`startGenesisBlock()`方法，这个是用来初始化区块链的第一个区块
## 创建创世区块
在区块链中，创世区块就是在在区块链中第一个创建的区块。当一个区块和区块链结合的时候，它必须要引用前面的区块。

然而创世区块是初始区块，他没有前面的区块可以引用。因此，创世区块通常被硬编码在区块链中，后加入的区块就能够直接引用创世区块了。  

在上面代码中，调用了`startGenesisBlock()`方法创建了创世区块。可以看到的使用在调用CryptoBlock的时候把index,timestamp,data和precedingHash都当做参数传入

## 获取最新的区块
获取区块链中最新的区块有助于保证当前区块的hash值指向前一个区块的hash值，这可以用来维护区块的完整性。

这里使用`obtainLatestBlock()`来实现它

## 添加新的区块
这里使用`addNewBlock()`来往链中添加区块。为了实现这个，先要获取到前一个block的hash值，然后把新添加的precedingHash设置为前面一个block的hash值，然后在设置当前block的hash值。计算完成以后，向整个区块链中加入当前区块

在实现中，想往区块链中加入一个区块是没有这么简单的，因为在加入区块的过程中需要好几次校验。但是足够让人理解这个区块链的工作原理。

# 测试区块链
下面调用CryptoBlockchain创建一个区块链，看生成的结果是怎样的。
```js
let smashingCoin = new CryptoBlockchain();
smashingCoin.addNewBlock(new CryptoBlock(1, '01/06/2020', {
  sender: 'sender1',
  recipient: 'recipient1',
  quantity: 50
}))
smashingCoin.addNewBlock(new CryptoBlock(1, '01/07/2020', {
  sender: 'sender2',
  recipient: 'recipient2',
  quantity: 100
}))
console.log(JSON.stringify(smashingCoin, null, 4))
```
在上面代码中创建了`CryptoBlockChain`的实例并赋值给smashingCoin，然后向区块链中添加了一些随机值，在data参数中包含发送者、票据、成交量等信息。执行上面的脚本，可以得到以下的结果:


可以看到这个smashingCoin包含blockchain属性，它包含所有链中所有的区块。并且除了创世区块当前区块的precedingHash值都等于前一个区块的hash值。完成基本的功能以后，下面添加一些常用的功能来增强区块链。

# 确保区块链的完整性
前面提到区块一旦被加入区块链中，那这个区块就无法更改。  

为了确保这个区块链的正确性，在`CryptoBlockchain`类添加了`checkChainValidity()`方法。

hash是用来保证这个区块的准确性和安全性的，因为一旦区块发生了改变就会导致生成一个新的hash，那么整个区块链就不在是完整的了。  

这个方法主要是验证在整个区块链中当前block的precedingHash是否和前一个的hash值相同，并且当前区块的hash值是否和计算出来的hash值相同。如果不满足返回false，否则返回true

下面是具体的代码
```js
checkChainVaildity() {
  for (let i = 1; i < this.blockchain.length; i++) {
    const currentBlock = this.blockchain[i];
    const precedingBlock = this.blockchain[i - 1];

    if (currentBlock.hash !== currentBlock.computedHash()) {
      return false;
    }

    if (currentBlock.precedingHash !== precedingBlock.hash) {
      return false;
    }  
  }
  return true;
}
```
# 添加工作证明
在前面提到，工作证明是用于增加挖掘和增加区块链的新概念。  

在上面生成的区块链`smallingCoin`中，我将应用一个简单的算法用来避免人们轻易的生成新的区块或者滥发区块链。

所以在CryptoBlock类中增加了一个叫proofOfWork。本质上，这个算法接受一个难度数字，只有当生成的hash值前面的0的个数和这个难度数字相同的时候，运算才算通过。

为了确保每个区块生成的hash值开头的0的个数和难度等级相同需要大量的计算，难度等级越高，生成区块的难度也就越高

此外，还给每个区块添加了一个随机数，当hash值重新计算的时候，这个难度限制仍然存在

下面是具体的代码
```js
proofOfWork(difficulty) {
  while(this.hash.substring(0, difficulty) !== Array(difficulty + 1).join('0')) {
    this.nounce++;
    this.hash = this.computedHash();
  }
}
```
此外为了在生成块时添加工作正面，需要在addNewBlock中添加对应的处理函数，具体如下
```js
addNewBlock(newBlock){
      newBlock.precedingHash = this.obtainLatestBlock().hash;
      //newBlock.hash = newBlock.computeHash(); 
      newBlock.proofOfWork(this.difficulty);       
      this.blockchain.push(newBlock);
  }
```

```js
computeHash() {
  return SHA256(this.index + this.precedingHash + this.timestamp + JSON.stringify(this.data) + this.nounce).toString();
}
```


```js
addNewBlock(newBlock) {
  newBlock.precedingHash = this.obtainLatestBlock().hash;
  newBlock.proofOfWork(this.difficulty);
  this.blockchain.push(newBlock)
}
```

# 总结
上面就是构建区块链的所有内容

当然目前这个区块链距离完美还有很多事情要做。如果要将这个区块链继续扩展，需要了解目前市场的需要，例如安全，可靠等方向进行扩展

尽管如此，我希望这个教程能够帮助你学习到一些区块链的知识，了解加密货币的原理。
