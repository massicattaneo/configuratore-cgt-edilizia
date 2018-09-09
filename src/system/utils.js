import { HtmlView } from "gml-html";

export function createModal(template, params, saveForm) {
    const modalView = HtmlView(template, {}, params);
    const modal = modalView.get();
    document.getElementById('modal').innerHTML = '';
    dialogPolyfill.registerDialog(modal);
    document.getElementById('modal').appendChild(modal);
    modal.showModal();
    modalView.get('form').save = async function(...args) {
        saveForm.call(this, close, ...args);
    };
    modalView.get('form').close = close;

    function enterKey(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            saveForm.call(modalView.get('form'), close)
        }
    }

    window.addEventListener("keydown", enterKey);

    function close() {
        modal.close();
        window.removeEventListener("keydown", enterKey)
    }

    setTimeout(componentHandler.upgradeDom, 0);

    return { modalView, modal };
}