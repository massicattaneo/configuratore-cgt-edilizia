import { getEmptyDb } from '../../../web-app-deploy/shared';

export default async function ({ system, wait }) {
    const { url, email, password, lang } = this;
    try {
        const req = RetryRequest(`/api/db${url}`, { headers: { 'Content-Type': 'application/json' } });
        try {
            const res = await req.get(JSON.stringify({ email, password, lang }));
            const parse = JSON.parse(res.responseText);
            return parse;
        } catch (e) {
            return getEmptyDb();
        }

    } catch (e) {
        system.throw(e.responseText);
    }
}
