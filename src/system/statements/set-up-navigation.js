function compare(a, b, position) {
    return a.split('/')[position + 1] === b.split('/')[position + 1];
}

function setPageInfo(href, context, gos) {
    const urls = context.locale.get('urls');
    const goName = Object.keys(urls).filter(key => urls[key].href === href);
    const { title } = urls[goName];
    document.title = context.locale.get('documentWindowTitle', title);
    document.getElementById('main').innerHTML = '';
    document.getElementById('main').appendChild(gos[goName].get());
    gos.header.setTitle(title);
    document.getElementById('menu').classList.remove('is-visible');
    let querySelector = document.querySelector('.mdl-layout__obfuscator');
    if (querySelector)
        querySelector.classList.remove('is-visible');
    componentHandler.upgradeDom();
}

export default async function ({ system, gos }) {
    const context = this;
    let activeUrl = '';

    /** START an APP */
    system
        .onNavigate()
        .filter(e => e.match(/\//g).length > 1 && e.substr(0, 4) !== '/api')
        .subscribe(async (event) => {
            const old = activeUrl;
            activeUrl = event;
            if (old !== event) {
                if (!compare(old, event, 0)) {
                    /** change language */
                    setPageInfo('/it', context, gos);
                }
                if (!compare(old, event, 1)) {
                    /** change page */
                    setPageInfo(event, context, gos);
                }
            }
        });

    system
        .onNavigate()
        .filter(e => e === '/it')
        .subscribe(() => {
            activeUrl = '/it';
            setPageInfo(activeUrl, context, gos);

            if (system.info().lang === 'it') return;
            system.info().lang = 'it';
        });

    system
        .onNavigate()
        .filter(e => e === '/api/login/confirm')
        .subscribe(async () => {
            system.navigateTo(activeUrl = context.locale.get(`urls.homePage.url`));
        });

    system
        .catch()
        .subscribe(function (errorName, { message }) {
            const errorMessage = context.locale.get(`errors.${errorName}`);
            const errorGeneric = context.locale.get(`errors.generic`);
            const msg = errorName !== 'custom' ? (errorMessage instanceof String ? errorMessage : errorGeneric) : message;
            const error = document.getElementById('errors');
            error.MaterialSnackbar.showSnackbar({ message: msg });
            system.store.loading = false;
        });

    window.navigate = function (el) {
        this.event.preventDefault();
        system.navigateTo(el.pathname);
    }

}
