## 背景
`hook`中可以使用`useContext`进行状态管理，具体代码如下：  
使用`createContext`创建一个`Context`对象  
在子组件中使用`useContext`进行消费
```jsx
export const AppContext = React.createContext();
```
父组件中使用`createContext`创建的`Context.Provider`。这个组件允许消费组件订阅`Context`的变化。当 Provider 的 value 值发生变化时，它内部的所有消费组件都会重新渲染
```jsx
// parent.jsx
const [position, setPosition] = useState({
	left: 0,
    top: 0,
});
const change = () => {
	setPosition({
    	left: position.left++,
        top: 0
    })
}
return (
	<AppContext.Provider value={position}>
    	<button onClick={change}>change<button>
        <Child />
    </AppContext.Provider>
)
```
在子组件中消费`Context`值的变化
```jsx
// child.jsx
const store = useContext(AppContext);
return <span>top: {store.top}; random: {Math.random()}</span>
```
在上面代码中`child`就能够消费在`parent`中定义的值。  
但是上面这么做存在一个问题，在`child`组件中我们依赖了`store.top`的值，但是在父组件更改`left`值的时候，`random`值也跟着更改，表示这个组件被多次渲染。这显然是不合理的，那有没有一种办法可以实现这个子组件依赖`Context`中某个值，当这个值发生改变时组件才重新渲染，其他值发生改变，并不会导致子组件的重新渲染。
大概思路如下:
```jsx
const store = useStore(['left']);
return <span>child</span>
```
在上面我们只需要`store`中`left`的值，当`left`值发生改变时，组件才开始重新渲染。`store`中`top`的更改不会导致组件的重渲染
## 使用`React.memo`
`React.memo`可用于`props`的变更检查，当`props`没有发生改变时，那么该组件就不会渲染，那么`Child`组件可拆分为两个组件
```jsx
const InnerChild = React.memo(({ top }) => (
  <span>
    top: {top}; random: {Math.random()}
  </span>
));
function Child() {
  const store = useContext(AppContext);
  return <InnerChild top={store.top} />;
}
```
使用`React.memo`包裹组件，因为父组件只会更改`left`的值，所以`top`始终不会发生更改，那么当前组件也就不会重新渲染
## 使用`useMemo`进行缓存组件
把创建函数和依赖项数组作为参数传入`useMemo`，它仅会在某个依赖项改变时才重新计算`memoized`值。那么就可以把上面的子组件改为以下:
```jsx
// child
 const store = useContext(AppContext);
 return useMemo(() => <span>random: {Math.random()}</span>, [store.top]);
```
这样只有当`store.top`发生改变时，`useMemo`返回值才会发生改变。  
但是这种方式也有一个弊端，当子组件需要维护大量的状态的时候，`useMemo`依赖项就需要写很多，就可能导致漏掉而导致状态更新了，`DOM`树没有更新。
## 拆分`Context`
这种思路借鉴于发布订阅者模式，发布者发布数据后，只会对其依赖数据的组件进行更新。  
下面是具体的使用方式
```jsx
const { Provider, useModal } = createModel((initState) => {
	const [count, setCount] = React.useState(0);
  	const [value, setValue] = React.useState('value');
  	const inc = function () {
    	setCount(count + 1);
  	};
  	const dec = function () {
    	setCount(count - 1);
  	};
  	return { count, inc, dec, value, setValue };
});
```
然后在父组件中使用`Provider`进行提供值
```jsx
function Parent() {
	return (
    <Provider>
    	<Child />
        <Count />
    </Provider>)
}
```
在`Provider`中提供两个了两个组件，这两个组件分别依赖了`Provider`中不同的值，具体如下:
```jsx
const Child = () => {
  const { count, inc, dec } = useModel(['count']);
  return (
    <div>
      {Math.random()}
      <Button onClick={dec}>-</Button>
      <span>{count}</span>
      <Button onClick={inc}>+</Button>
    </div>
  );
};
const Counter = () => {
  const { value, setValue } = useModel(['value']);
  return (
    <div>
      {Math.random()}
      <input value={value} onChange={e => setValue(e.target.value)} />
    </div>
  );
};
```
在上面代码中`Count`子组件只希望`value`值发生改变时，组件重新渲染，而`Child`组件只期望`count`值发生改变时，组件重新渲染。  
先讲一下这种方式的思路，简单来说就是发布订阅者模式，`Provider`就是发布者，`Child`、`Count`就是订阅者。当`Provider`值发生改变时，需要通知所以订阅者进行更新。订阅者收到更新通知后，根据对比之前的值判断是否需要更新。  
### 实现发布订阅者模式
首先需要实现一个简单的发布订阅者模式
```js
class Subs {
	constructor(state) {
		this.state = state;
        this.observers = [];
	}
    add(observer) {
    	this.observers.push(observer)
    }
    notify() {
		this.observers.forEach(observer => observer())
	}
    delete(observer) {
    	const index = this.observers.findIndex(item => item === observer);
        if (index > -1) {
			this.observers.splice(index, 1);
		}
    }
}
```
`add`方法用于往订阅列表中添加订阅者，`notify`就用通知所有订阅者进行更新
### `Provider`
需要包装`Provider`，当提供的值发生更改时，需要通知所有的订阅者触发更新
```jsx
function createModel(model) {
	const Context1 = createContext(null);
    const Context2 = createContext(null);
    const Provider = ({ initState, children }) => {
		const containerRef = useRef();
        if (!containerRef.current) {
        	containerRef.current = new Subs(initState);
        }
        const sealedInitState = useMemo(() => initState, []);
    	const state = model(sealedInitState);
        
        useEffect(() => {
        	containerRef.current.notify();
        })
        return (
        	<Context1 value={state}>
            	<Context2 value={containerRef.current}>
                	{children}
                </Context2>
            </Context1>
        )
	}
    return {
		Provider
	}
}
```
代码还是比较简单的，创建了两个`Context`，子组件如果需要向`useModel(['count'])`这么使用那么实际消费的是`Context2`提供的值，如果直接`useModel()`就直接消费`Context1`的值。
### `useModel`
这个函数所需要实现的功能就是在子组件创建的时候把更新函数`push`到`Provider`的订阅列表中，具体代码如下:
```jsx
const useModel = (deps = []) => {
	const sealedDeps = useMemo(() => deps, []);

    if (sealedDeps.length === 0) {
      return useContext(Context1);
    }
    
    const container = useContext(Context2);
    const [state, setState] = useState(container.state);
    const prevDepsRef = useRef([]);
    useEffect(() => {
    	const observer = () => {
			const prev = prevDepsRef.current;
            const curr = getAttr(container.state, sealedDeps);
            if (!isEuqal(prev, curr)) {
				setState(container.state)
			}
            prev.current = curr;
		}
        container.add(observer)
        return () => {
			container.delete(observer)
        }
    }, [])
    return state;
}
```
简单来说在调用的`useModel`的时候，发布者收集该依赖，然后当值发生更新触发`observer`函数，这个函数需要比对更改前和更改后的值是否发生更改，如果更改就重新设置`state`的值。最后返回这个`state`的值

这样按需加载更新组件就实现了
## `react-tracked`
使用`react-tracked`也能实现按需更新组件，具体如下代码可参考[`react-tracked`](https://github.com/dai-shi/react-tracked), 大概思路也是参考发布订阅者模式进行按需更新

欢迎各位小伙伴关注我的[`github`](https://github.com/skychenbo/Blog)，多多点赞ღ( ´･ᴗ･` )比心
