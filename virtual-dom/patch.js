var _ = require('./util')


var REPLACE = 0,    // replace
    REORDER = 1,    // reorder
    PROPS   = 2,    // props
    TEXT    = 3     // text

function patch(node, patches) {
    var walker = {index: 0}
    dfsWalk(node, walker, patches)
}

function dfsWalk(node, walker, patches) {
    var currentPatches = patches[walker.index] // 当前节点的差异

    var len = node.childNodes
        ? node.childNodes.length
        : 0

    for (var i = 0; i < len; i++) { // 深度遍历子节点
        var child = node.childNodes[i]
        walker.index++
        dfsWalk(child, walker, patches)
    }

    if (currentPatches) {
        applyPatches(node, currentPatches)
    }
}

function applyPatches(node, currentPatches) {
    _.each(currentPatches, function (currentPatches) {
        switch (currentPatches.type) {
            case REPLACE:
                var newNode = (typeof currentPatch.node === 'string')
                    ? document.createTextNode(currentPatch.node)
                    : currentPatch.node.render()
                node.parentNode.replaceChild(newNode, node)
                break;
            case REORDER:
                reorderChldren(node, currentPatch.moves)
                break
            case PROPS:
                setProps(node, currentPatch.props)
                break
            case TEXT:
                if (node.textContent) {
                    node.textContent = currentPatch.content
                } else {
                    node.nodeValue = currentPatch.content
                }
                break
            default:
                throw new Error('Unknown patch type ' + currentPatch.type)
        }
    })
}

function setProps(node, props) {
    for (var key in props) {
        // void 666 == undefined 为什么使用void因为
        // 有些地方undefined可能被重新赋值
        if (props[key] === void 666) {
            node.removeAttribute(key)
        } else {
            var value = props[key]
            _.setAttr(node, key, value)
        }
    }
}

// 某个父节点的子节点操作
function reorderChldren(node, moves) {
    var staticNodeList = _.toArray(node.childNodes)
    var maps = {}

    // map是node节点key属性的键值对对象
    _.each(staticNodeList, function (node) {
        if (node.nodeType === 1) {
            var key = node.getAttribute('key')
            if (key) {
                maps[key] = node
            }
        }
    })

    _.each(moves, function (move) {
        var index = move.index
        // 如果是replace类型
        if (move.type === 0) {
            if (staticNodeList[index] === node.childNodes[index]) {
                node.removeChild(node.childNodes[index])
            }
            staticNodeList.splice(index, 1)
        } else if (move.type === 1) {
            var insertNode = maps[move.item.key]
                ? maps[move.item.key].cloneNode(true)
                : (typeof move.item === 'object')
                    ? move.item.render()
                    : document.createTextNode(move.item)
            staticNodeList.splice(index, 0, insertNode)
            node.insertBefore(insertNode, node.childNodes[index] || null)
        }
    })
}

patch.REPLACE = REPLACE
patch.REORDER = REORDER
patch.PROPS = PROPS
patch.TEXT = TEXT

module.exports = patch
