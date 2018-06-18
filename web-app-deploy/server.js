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
const https = require('https');
const dropbox = require('./dropbox')();
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname + '/private/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname + '/private/cert.pem'))
};
const urlParse = require('url');
const fileUpload = require('express-fileupload');
const createTemplate = require('./mailer/createTemplate');
const privateInfo = require('./private/privateInfo.json');

function noCache(req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    next();
}

(async function () {
    const { store, db } = await mongo.connect();
    const bruteforce = new ExpressBrute(store);

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

    function requiresLogin(req, res, next) {
        if (req.session && req.session.userId) {
            return next();
        } else {
            res.send('anonymous');
        }
    }

    LoginServices({ app, mongo, mailer, bruteforce, requiresLogin });

    app.get('/dpx-photos/*', function (req, res) {
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

    app.get('/api/pdf/:table/:id',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            const budget = (await mongo.rest.get(table, `_id=${id}`))[0];
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`))[0];
            if (table === 'vehiclebudgets') {
                createPdfVehicleBudget(res, budget, dropbox.getDb(req.session.userAuth), user);
            } else if (table === 'equipmentbudgets') {
                createPdfEquipmentBudget(res, budget, dropbox.getDb(req.session.userAuth), user);
            } else {
                res.send('');
            }
        });

    app.get('/api/email/:table/:id',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            const budget = (await mongo.rest.get(table, `_id=${id}`))[0];
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`))[0];
            const email = [budget.client.email, user.email];
            if (!fs.existsSync(`${__dirname}/temp`)) fs.mkdirSync(`${__dirname}/temp`);
            const pdfBudget = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.pdf`;
            const file = fs.createWriteStream(pdfBudget);
            if (table === 'vehiclebudgets') {
                createPdfVehicleBudget(file, budget, dropbox.getDb(req.session.userAuth), user);
            } else {
                createPdfEquipmentBudget(file, budget, dropbox.getDb(req.session.userAuth), user);
            }
            await (new Promise(r => setTimeout(r, 1000)));
            const attachments = [{
                filename: 'Offerta.pdf',
                path: pdfBudget
            }];
            attachments.push(...(await dropbox.getAttachments(table, budget)));
            mailer.send(createTemplate('budget', { table, budget, user, email, attachments }));
            res.send('ok');
        });

    app.get('/api/db/all',
        noCache,
        requiresLogin,
        function (req, res) {
            res.send(dropbox.getDb(req.session.userAuth));
        });

    app.post('/api/upload',
        requiresLogin,
        async function (req, res) {
            const name = req.files.exchangeUpload.name;
            const ext = path.extname(name);
            const { _id } = await mongo.rest.insert('uploads', { name });
            const url = `${_id}${ext}`;
            const file = await mongo.rest.update('uploads', _id, { url });
            dropbox.updload(url, req.files.exchangeUpload.data);
            res.send(file);
        });

    app.delete('/api/upload/:id',
        requiresLogin,
        async function (req, res) {
            const id = req.params.id;
            await mongo.rest.delete('uploads', id);
            res.send('ok');
        });

    app.get('/api/rest/*',
        requiresLogin,
        noCache,
        async function (req, res) {
            const path = decodeURI(req.url).substr(10, 1000000).split('?');
            mongo.rest.get(path[0], path[1])
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.post('/api/rest/:table',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const userId = req.session.userId;
            mongo.rest.insert(table, Object.assign(req.body, { ip, userId }))
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.put('/api/rest/:table/:id',
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            mongo.rest.update(table, id, req.body)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    app.delete('/api/rest/:table/:id',
        async function (req, res) {
            const table = req.params.table;
            const id = req.params.id;
            mongo.rest.delete(table, id)
                .then(function (cash) {
                    res.send(cash);
                })
                .catch(function (err) {
                    res.status(500);
                    res.send(err.message);
                });
        });

    let callback;
    if (isDeveloping) {
        callback = require('../webpack/dev-server')(app, express);
    } else {
        app.use(express.static(__dirname + '/static'));
        callback = function response(req, res) {
            res.sendFile(path.join(__dirname, 'static/index.html'));
        };
    }
    app.get('*', callback);

    app.listen(port, () => {
        console.log('http server running at ' + port);
    });


    // const httpsPort = 8094;
    // https.createServer(httpsOptions, app).listen(httpsPort, () => {
    //     console.log('https server running at ' + httpsPort);
    // });

})();

