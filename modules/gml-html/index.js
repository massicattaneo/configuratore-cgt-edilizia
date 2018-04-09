
export function Render(elements, node, params = {}) {
    Object.keys(elements).forEach(key => {
        node.appendChild(elements[key](params))
    })
}

export * from './HtmlView';


