export default async function ({ system, wait }) {
    try {
        await RetryRequest('/api/login/logout').post();
    } catch (e) {
        system.throw(e.responseText);
    }
}
