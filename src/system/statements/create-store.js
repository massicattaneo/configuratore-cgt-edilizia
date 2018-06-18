export default async function ({ system, thread, gos }) {
    let status = await getStatus();

    system.db = await thread.execute('db-get', { url: '/all' });

    system.store = rx.create({
        logged: status.logged,
        email: status.email,
        userAuth: status.userAuth,
        vehiclebudgets: status.vehiclebudgets,
        equipmentbudgets: status.equipmentbudgets,
        vehicleorders: status.vehicleorders,
        equipmentorders: status.equipmentorders,
        loading: false
    });

    system.initStorage({
        vehicle: {},
        equipement: {}
    });

    async function getStatus() {
        const reqStatus = RetryRequest('/api/login/status');
        try {
            return JSON.parse((await reqStatus.get()).responseText);
        } catch (e) {
            return status = {
                logged: false,
                email: '',
                userAuth: -1,
                vehiclebudgets: [],
                equipmentbudgets: [],
                vehicleorders: [],
                equipmentorders: []
            };
        }
    }

    let firstTime = false;
    rx.connect
        .partial({ logged: () => system.store.logged })
        .filter(() => {
            const should = firstTime;
            firstTime = true;
            return should;
        })
        .subscribe(async function ({ logged }) {
            const { email, userAuth, vehiclebudgets, equipmentbudgets, vehicleorders, equipmentorders } = await getStatus();
            system.db = logged ? await thread.execute('db-get', { url: '/all' }) : {
                codes: [],
                equipements: [],
                familys: [],
                models: [],
                versions: []
            };
            system.store.email = email;
            system.store.userAuth = userAuth;
            system.store.vehiclebudgets.splice(0, system.store.vehiclebudgets.length);
            system.store.vehiclebudgets.push(...vehiclebudgets);
            system.store.equipmentbudgets.splice(0, system.store.equipmentbudgets.length);
            system.store.equipmentbudgets.push(...equipmentbudgets);
            system.store.vehicleorders.splice(0, system.store.vehicleorders.length);
            system.store.vehicleorders.push(...vehicleorders);
            system.store.equipmentorders.splice(0, system.store.equipmentorders.length);
            system.store.equipmentorders.push(...equipmentorders);
            gos.vehicles.updateDb();
            gos.equipments.updateDb();
        });
}