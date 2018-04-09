import {HtmlView} from "gml-html";
import template from './template.html';
import * as style from './style.scss';

export default async function ({system}) {
    const view = HtmlView(template, style);

    ({
        loading: () => system.store.loading
    }).reactive()
        .connect(function ({ loading }) {
            view.get('progress').style.opacity = loading ? 1 : 0;
        });

    view.setTitle = function (title) {
        view.get('title').innerHTML = title;
    };

    return view;
}