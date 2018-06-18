export default async function ({ system, wait }) {

    let s = location.pathname.substr(1, 2);
    const lang = ['it'].indexOf(s) !== -1 ? s : 'it';
    this.redirectUrl = location.pathname === '/' ? '/'+lang : location.pathname + location.search;
    system.initStorage({ lang });

    await wait.all([
        system.loadStageFiles('system').start(),
        system.navigateTo(`/${lang}`)
    ]);

}