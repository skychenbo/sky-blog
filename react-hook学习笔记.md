主要记录使用`hook`遇到的一些问题
## useRef能引起页面重渲染吗
更改ref.current的值不能引起react的重渲染
具体代码如下:
```jsx
const Index: React.FC<{}> = () => {
  console.log(1);
  const ref = useRef(1);
  ref.current = 2;
  const change = () => {
    console.log('change');
    ref.current = 4;
    console.log(ref.current);
  };
  return (
    <div>
      <Button onClick={change}>change</Button>
      <span>{ref.current}</span>
    </div>
  );
};
```
当点击`button`的时候，更改了`ref`的值，`console`只执行了一次，得出结论`useRef`的更改不会引起页面的重渲染
## 多个`state`是否需要合并
有以下场景，对于多个变量使用了多次`useState`
```jsx
const [left, setLeft] = useState(0);
const [right, setRight] = useState(0);
```
是否可以更改为
```jsx
const [position, setPosition] = useState({
	left: 0,
    right: 0
});
```
`useState`不同于`class component`中的`setState`，`useState`相当于重新赋值，而`setState`相当于合并赋值
## 什么场景可以使用`useCallback`
在下面场景中，当`Parent`组件中`state`发生改变时，`childChange`这个函数因为父组件重新渲染，导致函数重新创建，子组件就重新渲染
这个时候使用`useCallback`就可以避免`childChange`因为父组件重新渲染而重新创建，这样就避免了子组件的重新渲染
```jsx
const OwnComponent = props => {
  const { childChange } = props;
  console.log('re-render');
  return <Button onClick={childChange}>child</Button>;
};

const Parent: React.FC<{}> = () => {
  const [count, setCount] = useState(0);
  const childChange = () => {
    console.log('1');
  };
  const parentChange = () => {
    setCount(2);
  };
  return (
    <div>
      <Button onClick={parentChange}>change</Button>
      <span>{count}</span>
      <OwnComponent childChange={childChange} />
    </div>
  );
};
```
## `useCallback`和`useMemo`的区别
`api`层面上基本都是一样的，需要一个函数，还有依赖值。  
`useCallback`是根据依赖(`deps`)缓存第一个入参的(`callback`)。  
`useMemo`是根据依赖(`deps`)缓存第一个入参(`callback`)执行后的值。  
可表示为以下的伪代码
```jsx
const memoizedCallback = useCallback(
  () => {
    doSomething(a, b);
  },
  [a, b],
);
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
```
## 使用`useContext`进行状态管理
创建挂载容器，并在最外层使用它，如下:
```jsx
import { createContext, useContext } from 'react';

// app context. shared state
export const AppContext = createContext(/* 默认值 */0);
export function useStore() {
  return useContext(AppContext);
}

// 父组件
const [count, setCount] = useState(0);
<AppContext.Provider value={config}>
	<button onClick={() => setCount(count++)}>change</button>
	<Child></Child>
</AppContext>
```
然后在`Child`组件中消费这个数据
```jsx
// child
const count = useStore();
console.log(count);
```
可以看到当父组件中每次更改后，子组件中都会拿到最新的`count`值
## `useState`的异步渲染
在`class component`中，`setState`可以传入第二个参数用于处理状态变更后的逻辑，如下: 
```jsx
const { list } = this.state;
this.setState({
	list: list.slice(1, 2)
}, () => {
	// 你的处理逻辑
})
```
但是在`useState`中可以处理状态变更后的`callback`， 所以在`hook`中需要改变一种思路，如下
```jsx
const [list, setList] = useState([]);
// 例如list是处理后的值
const temp = list.slice(1, 2)
setList(temp)
```
所以当我们需要依赖`list`发生改变时，执行某个操作，需要像下面这种方式书写
```jsx
useEffect(() => {
	// 你的处理逻辑
}, list)
```
## 什么场景使用`useReducer`
当你的一个操作会更改多个`state`的时候，可以考虑使用`useReducer`
例如有以下场景
```jsx
function LoginPage() {
    const [name, setName] = useState(''); // 用户名
    const [pwd, setPwd] = useState(''); // 密码
    const [isLoading, setIsLoading] = useState(false); // 是否展示loading，发送请求中
    const [error, setError] = useState(''); // 错误信息
    const [isLoggedIn, setIsLoggedIn] = useState(false); // 是否登录

    const login = (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);
        login({ name, pwd })
            .then(() => {
                setIsLoggedIn(true);
                setIsLoading(false);
            })
            .catch((error) => {
                // 登录失败: 显示错误信息、清空输入框用户名、密码、清除loading标识
                setError(error.message);
                setName('');
                setPwd('');
                setIsLoading(false);
            });
    }
    return ( 
        //  返回页面JSX Element
    )
}
```
在登录操作中，我们维护了多个状态，每次操作都需要更改多个`state`。如果页面逻辑继续扩张，每次操作需要操作更多的`state`，很可能造成错误或者遗漏，所以这里尝试使用`useReducer`
```jsx
const initState = {
        name: '',
        pwd: '',
        isLoading: false,
        error: '',
        isLoggedIn: false,
    }
    function loginReducer(state, action) {
        switch(action.type) {
            case 'login':
                return {
                    ...state,
                    isLoading: true,
                    error: '',
                }
            case 'success':
                return {
                    ...state,
                    isLoggedIn: true,
                    isLoading: false,
                }
            case 'error':
                return {
                    ...state,
                    error: action.payload.error,
                    name: '',
                    pwd: '',
                    isLoading: false,
                }
            default: 
                return state;
        }
    }
    function LoginPage() {
        const [state, dispatch] = useReducer(loginReducer, initState);
        const { name, pwd, isLoading, error, isLoggedIn } = state;
        const login = (event) => {
            event.preventDefault();
            dispatch({ type: 'login' });
            login({ name, pwd })
                .then(() => {
                    dispatch({ type: 'success' });
                })
                .catch((error) => {
                    dispatch({
                        type: 'error'
                        payload: { error: error.message }
                    });
                });
        }
        return ( 
            //  返回页面JSX Element
        )
    }
```
虽然说代码变长了，但是可读性增强了，也能了解`state`的变化逻辑
<br>
<br>
<br>
持续学习，持续更新中...

