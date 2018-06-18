const createTemplate = require('./mailer/createTemplate');
const { confirmRegistrationUrl, registerUrl, loginUrl, logoutUrl, logStatusUrl, recoverUrl, resetUrl, deleteAccountUrl } = require('./serverInfo');
const ObjectId = require('mongodb').ObjectID;

module.exports = function ({ app, mongo, mailer, bruteforce, requiresLogin }) {

    app.get(logStatusUrl,
        requiresLogin,
        async function (req, res) {
            const userId = req.session.userId;
            const { email, userAuth } = await mongo.getUser({ _id: new ObjectId(userId) });
            const vehiclebudgets = await mongo.rest.get('vehiclebudgets', `userId=${userId}`) || [];
            const equipmentbudgets = await mongo.rest.get('equipmentbudgets', `userId=${userId}`) || [];
            const vehicleorders = await mongo.rest.get('vehicleorders', `userId=${userId}`) || [];
            const equipmentorders = await mongo.rest.get('equipmentorders', `userId=${userId}`) || [];
            const data = {};
            Object.assign(data, {
                logged: true,
                userAuth,
                email,
                vehiclebudgets: vehiclebudgets,
                equipmentbudgets: equipmentbudgets,
                vehicleorders: vehicleorders,
                equipmentorders: equipmentorders
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
            mongo.insertUser(req.body)
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