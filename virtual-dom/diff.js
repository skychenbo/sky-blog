var _ = require('./utils')
var patch = require('./patch')
var listDiff = require('./list-diff.js')

function diff(oldTree, newTree) {
    var index = 0
    var patches = {}
    dfsWalk(oldTree, newTree, index, patches)
    return patches
}

function dfsWalk(oldNode, newNode, index, patches) {
    var currentPatch = []

    // 如果node被移除
    if (newNode === null) {
        // 真实节点将被移除
    } else if (_.isString(oldNode) && _isString(newNode)) {
        // text不同的情况
        if (newNode !== oldNode) {
            currentPatch.push({ type: patch.TEXT, content: newNode })
        }
    } else if (
        // 属性不同的情况
        oldNode.tagName === newNode.tagName &&
        oldNode.key  === newNode.key
    ) {
        var propsPatches = diffProps(oldNode, newNode)
        if (propsPatches) {
            currentPatch.push({ type: patch.PROPS, props: propsPatches })
        }

        // 如果一个节点有一个'ignore'属性，不比较他们的孩子
        if (!isIgnoreChildren(newNode)) {
            diffChildren(
                oldNode.children,
                newNode.children,
                index,
                patches,
                currentPatch
            )
        }
        // 如果节点不同，用新的node代替老的节点
    } else {
        currentPatch.push({ type: patch.REPLACE, node: newNode })
    }

    if (currentPatch.length) {
        patches[index] = currentPatch
    }
}

// 比较节点的后代，这里涉及的listDiff的使用
// var diff = require("list-diff2")
// var oldList = [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}, {id: "e"}]
// var newList = [{id: "c"}, {id: "a"}, {id: "b"}, {id: "e"}, {id: "f"}]
//
// var moves = diff(oldList, newList, "id")
// `moves` is a sequence of actions (remove or insert):
// type 0 is removing, type 1 is inserting
// moves: [
//   {index: 3, type: 0},
//   {index: 0, type: 1, item: {id: "c"}},
//   {index: 3, type: 0},
//   {index: 4, type: 1, item: {id: "f"}}
//  ]

function diffChildren(oldChildren, newChildren, index, patches, currentPatch) {
    // 因为我是咸鱼，算法不太懂有兴趣的可以自己研究以下
    var diffs = listDiff(oldChildren, newChildren, 'key')
    newChildren = diffs.children

    if (diffs.moves.length) {
        // peorder
        var reorderPatch = { type: patch.PEORDER, moves: diffs.moves}
        currentPatch.push(reorderPatch)
    }

    let leftNode = null
    var currentNodeIndex = index
    _.each(oldChildren, function (child, i) {
        var newChild = newChildren[i]
        currentNodeIndex =  (leftNode && leftNode.count)
                ? currentNodeIndex + leftNode.count + 1
                : currentNodeIndex + 1
        dfsWalk(child, newChild, currentNodeIndex, patches)
        leftNode = child
    })
}


// oldNode和newNode属性值不同和新属性的提取出来
function diffProps(oldNode, newNode) {
    var count = 0
    var oldProps = oldNode.props
    var newProps = newNode.props

    var key, value
    var propsPatches = {}

    // 发现不同的属性
    for (key in oldProps) {
        value = oldProps[key]
        if (newProps[key] !== value) {
            count++
            propsPatches[key] = newProps[key]
        }
    }

    // 发现新的属性
    for (key in newProps) {
        value = newProps[key]
        if (!oldProps.hasOwnProperty(key)) {
            count++
            propsPatches[key] = newProps[key]
        }
    }

    if (count === 0) {
        return null
    }

    return propsPatches // 属性差异的集合
}

// 我猜这应该是提升性能的一种方式，没有属性'ignore'属性的node就忽略，能够提升性能
function isIgnoreChildren(node) {
    return (node.props && node.props.hasOwnProperty('ignore'))
}

module.export = diff
