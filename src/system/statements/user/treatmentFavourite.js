export default async function ({ system, wait }) {
    try {
        const req = RetryRequest('/api/treatments/favourite', { headers: { 'Content-Type': 'application/json' } });
        const res = await req.post(JSON.stringify(this));
        if (res.responseText !== 'ok') system.throw('generic-error');
    } catch (e) {
        system.throw('generic');
    }
}