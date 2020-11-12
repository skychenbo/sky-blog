var _ = require('./utils')

function Element(tagName, props, children) {
    if (!(this instanceof Element)) {
        if (!_.isArray(children) && children !== null) {
            children = _.slice(arguments, 2).filter(_.truthy)
        }
        return new Element(tagName, props, children)
    }

    if (_.isArray(props)) {
        children = props
        props = {}
    }

    this.tagName = tagName
    this.props = props || {}
    this.children = children || []
    // void 0 == undefined
    this.key = props
        ? props.key
        : void 666

    // 节点的总数
    var count = 0

    _.each(this.children, function (child, i) {
        if (child instanceof Element) {
            count += child.count
        } else {
            // 如果child是字符串
            children[i] = '' + child
        }
        count++
    })
    this.count = count
}

Element.prototype.render = function () {
    var el = document.createElement(this.tagName)
    var props = this.props

    for (var propsName in props) {
        var propValue = props[propName]
        _.setAttr(el, propName, propValue)
    }

    _.each(this.children, function (child) {
        var childEl = (child instanceof Element)
            ? child.render()
            : document.createTextNode(child)
        el.appendChild(childEl)
    })
    return el
}

module.exports = Element
