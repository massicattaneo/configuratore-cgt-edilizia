export default async function ({ system, wait }) {
    const { url, email, password, lang } = this;
    try {
        const req = RetryRequest(`/api/db${url}`, { headers: { 'Content-Type': 'application/json' } });
        try {
            const res = await req.get(JSON.stringify({ email, password, lang }));
            return JSON.parse(res.responseText);
        } catch (e) {
            return { familys: [], models: [], versions: [], equipements: [] }
        }

    } catch (e) {
        system.throw(e.responseText)
    }
}