const { isOutsourceDirection, isOutsource } = require('./shared');
const createTemplate = require('./mailer/createTemplate');
const { confirmRegistrationUrl, modifyUserUrl, registerUrl, loginUrl, logoutUrl, logStatusUrl, recoverUrl, resetUrl, deleteAccountUrl } = require('./serverInfo');
const ObjectId = require('mongodb').ObjectID;

module.exports = function ({ app, mongo, dropbox, mailer, bruteforce, requiresLogin }) {

    app.put(modifyUserUrl,
        requiresLogin,
        async function (req, res) {
            const { name, surname, organization, tel, discount } = req.body;
            const data = await mongo.rest
                .update('users', req.session.userId, { name, surname, tel }, { userAuth: 0 });
            if (isOutsourceDirection(req.session.userAuth)) {
                await mongo.rest.updateMany('users', { organization }, { discount });
            }
            res.send(data);
        });

    app.get(logStatusUrl,
        requiresLogin,
        async function (req, res) {
            const userId = req.session.userId;
            const user = await mongo.getUser({ _id: new ObjectId(userId) });
            if (!user.active) {
                req.session.destroy(function (err) {
                    if (err) {
                        res.status(500);
                        return res.send('error');
                    } else {
                        return res.send('anonymous');
                    }
                });
                return;
            }
            const vehiclebudgets = await mongo.rest.get('vehiclebudgets', `userId=${userId}`, { userAuth: 0 }) || [];
            const equipmentbudgets = await mongo.rest.get('equipmentbudgets', `userId=${userId}`, { userAuth: 0 }) || [];
            const vehicleorders = await mongo.rest.get('vehicleorders', `userId=${userId}`, { userAuth: 0 }) || [];
            const equipmentorders = await mongo.rest.get('equipmentorders', `userId=${userId}`, { userAuth: 0 }) || [];
            const data = {};
            delete user.activationCode;
            delete user.hash;
            const dbx = await dropbox.getDb(req.session.userAuth, user);

            Object.assign(data, {
                logged: true,
                user,
                vehiclebudgets: vehiclebudgets.map(i => {
                    const equipment = i.equipment.filter(id => dbx.equipements.find(e => e.id === id));
                    const vehicleExist = dbx.versions.find(v => v.id === i.version)
                    return Object.assign(i, {
                        equipment, outdated : (!vehicleExist) || equipment.length !== i.equipment.length
                    });
                }),
                equipmentbudgets: equipmentbudgets.map(i => {
                    const equipment = i.equipment.filter(id => dbx.equipements.find(e => e.id === id));
                    return Object.assign(i, {
                        equipment, outdated : equipment.length !== i.equipment.length
                    });
                }),
                vehicleorders: vehicleorders.filter(o => !o.deleted),
                equipmentorders: equipmentorders.filter(o => !o.deleted)
            });
            res.send(data);
        });

    app.get(confirmRegistrationUrl,
        async function response(req, res) {
            mongo.activateUser(req.query.activationCode, req.query.userAuth)
                .then(async function () {
                    const user = await mongo.getUser({
                        activationCode: req.query.activationCode
                    });
                    mailer.send(createTemplate('activeUser', user));
                    res.redirect('/it/utenza-attiva');
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        }
    );

    app.post(recoverUrl, function (req, res) {
        mongo.recoverPassword({ email: req.body.email })
            .then(function (user) {
                mailer.send(createTemplate('recoverEmail', user));
                res.send('ok');
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.post(resetUrl, function (req, res) {
        mongo.resetPassword(req.body)
            .then(function () {
                res.send('ok');
            })
            .catch(function (err) {
                res.status(500);
                res.send(err.message);
            });
    });

    app.post(registerUrl,
        bruteforce.prevent,
        async function response(req, res) {
            let discount = 0;
            if (isOutsource(req.body.type)) {
                const discountUser = await mongo.rest.get('users', `organization=${req.body.organization}`, { userAuth: 0 });
                if (discountUser.length) {
                    discount = discountUser[0].discount;
                }
            }
            mongo.insertUser(Object.assign(req.body, { discount }))
                .then(function (data) {
                    mailer.send(createTemplate('confirmEmail', data));
                    res.send('ok');
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post(loginUrl,
        bruteforce.prevent,
        async function response(req, res) {
            mongo.loginUser(req.body)
                .then(({ _id, email, userAuth }) => {
                    req.session.userId = _id;
                    req.session.email = email;
                    req.session.userAuth = userAuth;
                    res.send('ok');
                })
                .catch(err => {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post(logoutUrl,
        requiresLogin,
        function (req, res) {
            if (req.session) {
                // delete session object
                req.session.destroy(function (err) {
                    if (err) {
                        res.status(500);
                        return res.send('error');
                    } else {
                        return res.redirect('/');
                    }
                });
            }
        });

    app.post(deleteAccountUrl,
        requiresLogin,
        function (req, res) {
            if (req.session) {
                mongo.deleteUser({
                    userId: req.session.userId,
                    password: req.body.password
                }).then(function () {
                    req.session.destroy(function (err) {
                        if (err) {
                            res.status(500);
                            return res.send('error');
                        } else {
                            return res.send('ok');
                        }
                    });
                }).catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
            }
        });
};
