export default async function ({ system }) {
    let status = await getStatus();

    system.store = ({
        logged: status.logged,
        email: status.email,
        loading: false
    }).reactive();

    system.initStorage({});

    async function getStatus() {
        const reqStatus = RetryRequest('/api/login/status');
        try {
            return JSON.parse((await reqStatus.get()).responseText);
        } catch (e) {
            return status = {
                logged: false,
                email: ''
            }
        }
    }

    ({ logged: () => system.store.logged })
        .reactive()
        .connect(async function () {
            const { email } = await getStatus();
            system.store.email = email;
        });
}