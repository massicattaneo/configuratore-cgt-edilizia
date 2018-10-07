const path = require('path');
const express = require('express');
const port = process.env.PORT || 8093;
const app = express();
const mailer = require('./mailer/mailer')();
const isDeveloping = process.env.NODE_ENV === 'development';
const mongo = require('./mongo')(isDeveloping);
const bodyParser = require('body-parser');
const ExpressBrute = require('express-brute');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const LoginServices = require('./login-services');
const fs = require('fs');
const compression = require('compression');
const createPdfVehicleBudget = require('./pdf/createPdfVehicleBudget');
const createPdfEquipmentBudget = require('./pdf/createPdfEquipmentBudget');
const createPdfLeasingBudget = require('./pdf/createPdfLeasingBudget');
const createPdfPriceList = require('./pdf/createPdfPriceList');
const https = require('https');
const dropbox = require('./dropbox')(mongo);
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname + '/private/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname + '/private/cert.pem'))
};
const urlParse = require('url');
const fileUpload = require('express-fileupload');
const createTemplate = require('./mailer/createTemplate');
const privateInfo = require('./private/privateInfo.json');
const { createVehicleCgteXlsx, createVehicleOutsourceXlsx, createEquipmentXlsx } = require('./xlsx/xlsx');
const schedule = require('node-schedule');
const rimraf = require('rimraf');
const { isOutsource, createOrderXlsName } = require('./shared');
const emailsAddresses = require('./private/emails');

function noCache(req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
}

function getOrderEmail(userAuth) {
    const email = [];
    if (!isDeveloping && Number(userAuth) <= 1)
        email.push(emailsAddresses.adminOrders);
    else if (!isDeveloping && isOutsource(userAuth))
        email.push(emailsAddresses.outsourceOrders);
    else if (isDeveloping)
        email.push(emailsAddresses.dev);
    return email;
}

(async function () {
    const { store, db } = await mongo.connect();
    const bruteforce = new ExpressBrute(store, {
        freeRetries: 6,
        minWait: 500,
        maxWait: 60 * 1000, //milliseconds
        lifetime: 2 * 60 //seconds
    });

    app.use(fileUpload());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(session({
        cookie: { path: '/', httpOnly: true, secure: false, maxAge: Date.now() + (30 * 24 * 60 * 60 * 1000) },
        secret: privateInfo.sessionSecret,
        resave: true,
        saveUninitialized: false,
        store: new MongoStore({
            db: db
        })
    }));
    app.use(function (req, res, next) {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userId = req.session.userId ? `${req.session.userId}:${req.session.email}<USERAUTH:${req.session.userAuth}>` : 'ANONYMOUS';
        const method = req.method;
        const body = req.body;
        const url = req.url;
        if (!(url.startsWith('/assets/') || url.startsWith('/css/') || url.startsWith('/localization/') || url.startsWith('/system.bundle.js'))) {
            console.log(`${method}: ${ip}, "${url}": ${userId} [BODY: ${(!body.password) ? JSON.stringify(body) : 'encrypted'}]`);
        }
        next();
    });
    app.use(compression());

    /** INIT DROPBOX */
    await dropbox.init();

    function isLogged(req) {
        return req.session && req.session.userId;
    }

    function requiresLogin(req, res, next) {
        if (isLogged(req)) {
            return next();
        } else {
            res.send('anonymous');
        }
    }

    function filterUserAuth(type) {
        return function (req, res, next) {
            if (req.session.userAuth.toString() === '0') return next();
            if (type === 'get') {
                const path = decodeURI(req.url).substr(10, 1000000).split('?');
                if (path[0] === 'users') return false;
            } else {
                const table = req.params.table;
                if (table === 'users') return false;
            }
            next();
        };
    }

    LoginServices({ app, mongo, mailer, bruteforce, requiresLogin });

    app.get('/dpx-photos/*',
        function (req, res, next) {
            res.setHeader('Cache-Control', 'public, max-age=31557600');
            next();
        },
        function (req, res) {
            const file = __dirname + decodeURI(urlParse.parse(req.url).pathname);
            if (fs.existsSync(file)) {
                const s = fs.createReadStream(file);
                res.set('Content-Type', 'image/jpg');
                s.pipe(res);
            } else {
                res.status(404);
                res.send('');
            }
        });

    app.get('/api/dropbox/*',
        requiresLogin,
        async function (req, res) {
            const path = decodeURIComponent(req.url.replace('/api/dropbox/', ''));
            const file = await dropbox.download(path);
            res.type('pdf');
            res.end(file.fileBinary, 'binary');
        });

    app.get('/api/pdf/budget/:table/:id',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            const budget = (await mongo.rest.get(table, `_id=${id}`, req.session))[0];
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`, { userAuth: 0 }))[0];
            if (table === 'vehiclebudgets') {
                createPdfVehicleBudget(res, budget, await dropbox.getDb(req.session.userAuth, user), user);
            } else if (table === 'equipmentbudgets') {
                createPdfEquipmentBudget(res, budget, await dropbox.getDb(req.session.userAuth, user), user);
            }
        });

    app.get('/api/pdf/leasing/:table/:id',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            const budget = (await mongo.rest.get(table, `_id=${id}`, req.session))[0];
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`, { userAuth: 0 }))[0];
            createPdfLeasingBudget(res, Object.assign({ leasing: {} }, budget), await dropbox.getDb(req.session.userAuth, user), user);
        });

    app.get('/api/price-list/',
        requiresLogin,
        async function (req, res) {
            const userAuth = Number(req.session.userAuth);
            const includeType = req.query.includeType;
            const includeMin = (userAuth === 0 && (['priceMin', 'priceOutsource', 'priceCGT', 'priceOriginalOutsource'].indexOf(includeType) !== -1))
                || (userAuth === 1 && (['priceMin'].indexOf(includeType) !== -1))
                || (userAuth === 3 && (['priceOriginalOutsource', 'priceOutsource'].indexOf(includeType) !== -1))
                || (userAuth === 4 && (['priceOutsource'].indexOf(includeType) !== -1));
            const models = (req.query.models || '').split(',');
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`, { userAuth: 0 }))[0];
            createPdfPriceList(res, models, await dropbox.getDb(userAuth, user), includeMin, includeType);
        });

    app.get('/api/email/:table/:id',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            const budget = (await mongo.rest.get(table, `_id=${id}`, req.session))[0];
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`, { userAuth: 0 }))[0];
            const email = [budget.client.email, user.email];
            const pdfBudget = dropbox.uniqueTempFile();
            const file = fs.createWriteStream(pdfBudget);
            const db1 = await dropbox.getDb(req.session.userAuth, user);
            if (table === 'vehiclebudgets') {
                createPdfVehicleBudget(file, budget, db1, user);
            } else {
                createPdfEquipmentBudget(file, budget, db1, user);
            }
            const attachments = [{ filename: 'Offerta.pdf', path: pdfBudget }];
            await (new Promise(r => setTimeout(r, 1000)));
            if (budget.leasing && budget.leasing.loanPrice) {
                const pdfLeasing = dropbox.uniqueTempFile();
                const fileLeasing = fs.createWriteStream(pdfLeasing);
                createPdfLeasingBudget(fileLeasing,
                    Object.assign({ leasing: {} }, budget), await dropbox.getDb(req.session.userAuth, user), user);
                attachments.push({
                    filename: 'Offerta Finanziamento Leasing.pdf',
                    path: pdfLeasing
                });
            }
            await (new Promise(r => setTimeout(r, 1000)));
            attachments.push(...(await dropbox.getAttachments(table, budget)));
            mailer.send(createTemplate('budget', { table, budget, user, email, attachments, dbx: db1 }));
            res.send('ok');
        });

    app.post('/api/mail/:type', function (req, res) {
        const type = req.params.type;
        switch (type) {
        case 'order-delete':
            if (!isDeveloping)
                mailer.send(createTemplate(type, {
                    email: getOrderEmail(req.session.userAuth),
                    order: req.body.order
                }));
            break;
        }
        res.send('ok');
    });

    app.get('/api/db/all',
        noCache,
        async function (req, res) {
            if (isLogged(req)) {
                const user = (await mongo.rest.get('users', `_id=${req.session.userId}`, { userAuth: 0 }))[0];
                res.send(await dropbox.getDb(req.session.userAuth, user));
            } else
                res.send({
                    codes: [],
                    equipements: [],
                    familys: [],
                    models: [],
                    versions: [],
                    retailers: (await dropbox.getDb()).retailers.map(({ id, name }) => {
                        return { id, name };
                    })
                });
        });

    app.post('/api/upload',
        requiresLogin,
        async function (req, res) {
            const name = req.files.exchangeUpload.name;
            const ext = path.extname(name);
            const { _id } = await mongo.rest.insert('uploads', { name });
            const url = `${_id}${ext}`;
            const file = await mongo.rest.update('uploads', _id, { url }, { userAuth: 0 });
            await dropbox.updload(url, req.files.exchangeUpload.data);
            res.send(file);
        });

    app.delete('/api/upload/:id',
        requiresLogin,
        async function (req, res) {
            const id = req.params.id;
            const file = await mongo.rest.delete('uploads', id, { userAuth: 0 });
            await dropbox.delete(file.url);
            res.send('ok');
        });

    app.get('/api/rest/*',
        requiresLogin,
        filterUserAuth('get'),
        noCache,
        async function (req, res) {
            const path = decodeURI(req.url).substr(10, 1000000).split('?');
            mongo.rest.get(path[0], path[1], req.session)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    function getUserFamily(user) {
        const ua = Number(user.userAuth);
        if (ua === 0) return 'CGTE';
        if (ua === 1) return 'CGTE';
        if (ua === 2) return 'CGT';
        if (ua === 3) return user.organization;
        if (ua === 4) return user.organization;
    }

    app.post('/api/rest/:table',
        requiresLogin,
        filterUserAuth('post'),
        async function (req, res) {
            const table = req.params.table;
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userId = req.session.userId;
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`, { userAuth: 0 }))[0];
            mongo.rest.insert(table, Object.assign(req.body, { ip, userId, userFamily: getUserFamily(user) }))
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.put('/api/rest/:table/:id',
        requiresLogin,
        filterUserAuth('put'),
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            mongo.rest.update(table, id, req.body, req.session)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.delete('/api/rest/:table/:id',
        requiresLogin,
        filterUserAuth('delete'),
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            mongo.rest.delete(table, id, req.session)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post('/api/order/:table',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const userId = req.session.userId;
            const user = (await mongo.rest.get('users', `_id=${userId}`, { userAuth: 0 }))[0];
            const dbx = await dropbox.getDb(null, user);
            const progressive = await mongo.getOrderProgressive(user, dbx);
            const order = await mongo.rest.insert(table, Object.assign({ userId, progressive }, req.body));
            const budget = await mongo.rest.update(table.replace('orders', 'budgets'), req.body.budgetId, { ordered: true }, req.session);
            const xlsxPath = dropbox.uniqueTempFile('xlsx');
            const attachments = [];
            if (table === 'vehicleorders') {
                if (isOutsource(user.userAuth))
                    attachments.push(...createVehicleOutsourceXlsx(budget, dbx, order, user, xlsxPath));
                else
                    attachments.push(...createVehicleCgteXlsx(budget, dbx, order, user, xlsxPath));
            } else {
                attachments.push(...createEquipmentXlsx(budget, dbx, order, user, xlsxPath));
            }
            attachments.push(...(await dropbox.getAttachments(table, budget, order)));
            const email = getOrderEmail(req.session.userAuth);
            if (order.emailMe === 'on')
                email.push(user.email);
            mailer.send(createTemplate('order', { table, order, budget, user, dbx, attachments, email }));
            if (!isDeveloping)
                dropbox.updload(createOrderXlsName(order, user), fs.readFileSync(xlsxPath), '/Ordini');
            res.send(order);
        });

    let callback;
    if (isDeveloping) {
        callback = require('../webpack/dev-server')(app, express);
    } else {
        app.use(express.static(__dirname + '/static', {
            maxage: 365 * 24 * 60 * 60 * 1000,
            etag: false
        }));
        callback = function response(req, res) {
            if (req.headers['x-forwarded-proto'] === 'http') {
                res.redirect(`https://${req.headers.host}${req.url}`);
            } else {
                res.sendFile(path.join(__dirname, 'static/index.html'));
            }
        };
    }

    schedule.scheduleJob('0 3 * * *', function () {
        dropbox.backUpMongoDb();
        rimraf(`${__dirname}/temp`, function () {
            if (!fs.existsSync(`${__dirname}/temp`)) fs.mkdirSync(`${__dirname}/temp`);
        });
    });

    app.get('*', callback);

    app.listen(port, () => {
        console.log('http server running at ' + port);
    });


    // const httpsPort = 8094;
    // https.createServer(httpsOptions, app).listen(httpsPort, () => {
    //     console.log('https server running at ' + httpsPort);
    // });

})();

