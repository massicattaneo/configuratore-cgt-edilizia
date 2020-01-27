function updateDbForOldVersions(system) {
    system.db.getVersion = function (date) {
        const timestamp = new Date(date).getTime();
        if (timestamp > system.db.timestamp) return system.db;
        return system.db.olds.find(d => timestamp > d.timestamp);
    };
}

export default async function ({ system, thread, gos }) {
    let status = await getStatus();
    system.db = await thread.execute('db-get', { url: '/all' });
    updateDbForOldVersions(system);

    if (!status.logged) system.setStorage({ cart: [] });

    system.store = rx.create({
        logged: status.logged,
        email: status.user.email,
        userAuth: status.user.userAuth,
        user: status.user,
        vehiclebudgets: status.vehiclebudgets,
        equipmentbudgets: status.equipmentbudgets,
        vehicleorders: status.vehicleorders,
        equipmentorders: status.equipmentorders,
        loading: false,
        hasLogged: status.logged,
        cart: system.getStorage('cart') || []
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
                userAuth: 5,
                user: {},
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
            const { user, vehiclebudgets, equipmentbudgets, vehicleorders, equipmentorders } = await getStatus();
            system.db = await thread.execute('db-get', { url: '/all' });
            updateDbForOldVersions(system);
            system.store.email = user.email;
            system.store.userAuth = user.userAuth;
            system.store.user = user;
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
            system.store.hasLogged = logged;
        });

    system.updateDb = function () {
        gos.vehicles.updateDb();
        gos.equipments.updateDb();
    };
}
