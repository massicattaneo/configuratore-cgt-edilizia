export default async function ({ system, wait }) {
    try {
        const req = RetryRequest('/api/login/logout');
        await req.post();
    } catch (e) {
        system.throw(e.responseText);
    }
}