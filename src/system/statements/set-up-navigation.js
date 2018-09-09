function compare(a, b, position) {
    return a.split('/')[position + 1] === b.split('/')[position + 1];
}

const publicUrls = ['/it/entra', '/it/registrati', '/it/recupera-password', '/it/cambia-password', '/it/utenza-attiva'];

export default async function ({ system, gos }) {
    const context = this;
    let activeUrl = '';

    function setPageInfo(href, context, gos) {
        const length = href.indexOf('?') === -1 ? href.length : href.indexOf('?');
        const urls = context.locale.get('urls');
        let isPublic = publicUrls.indexOf(href.substr(0, length)) !== -1;
        const url = (isPublic || system.store.logged) ? href.substr(0, length) : '/it/entra';
        const goName = Object.keys(urls).find(key => urls[key].href === url);
        const { title } = urls[goName];
        document.title = context.locale.get('documentWindowTitle', title);
        if (document.getElementById('main').children[0]) {
            document.getElementById('main').removeChild(document.getElementById('main').children[0]);
        }
        document.getElementById('main').appendChild(gos[goName].get());
        gos.header.setTitle(title);
        document.getElementById('menu').removeStyle('is-visible');
        let querySelector = document.querySelector('.mdl-layout__obfuscator');
        if (querySelector)
            querySelector.removeStyle('is-visible');
        componentHandler.upgradeDom();
    }

    /** START an APP */
    system
        .onNavigate()
        .filter(e => e.match(/\//g).length > 1 && e.substr(0, 4) !== '/api')
        .subscribe(async(event) => {
            const old = activeUrl;
            activeUrl = event;
            if (old !== event) {
                if (!compare(old, event, 0)) {
                    /** change language */
                    setPageInfo('/it', context, gos);
                }
                if (!compare(old, event, 1)) {
                    /** change page */
                    setPageInfo(event.split('/').splice(0, 3).join('/'), context, gos);
                }
                if (!compare(old, event, 2)) {
                    const url = event.split('/').splice(0, 3).join('/');
                    const urls = context.locale.get('urls');
                    const goName = Object.keys(urls).find(key => urls[key].href === url);
                    const tableName = event.split('/').splice(3, 1).join('');
                    if (gos[goName].navigate && tableName)
                        {
                            gos[goName].navigate(tableName, context.locale.get('tables')[tableName]);
                        }
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
        .subscribe(async() => {
            system.navigateTo(activeUrl = context.locale.get(`urls.homePage.url`));
        });

    system
        .catch()
        .subscribe(function (errorName, { message }) {
            const errorMessage = context.locale.get(`errors.${errorName}`);
            const errorGeneric = context.locale.get(`errors.generic`);
            const msg = errorName !== 'custom' ? (typeof errorMessage == 'string' ? errorMessage : errorGeneric) : message;
            const error = document.getElementById('errors');
            error.MaterialSnackbar.showSnackbar({ message: msg });
            system.store.loading = false;
        });

    window.navigate = function (el, e) {
        const event = e || this.event;
        event.preventDefault();
        system.navigateTo(el.pathname);
        return false;
    };

}
