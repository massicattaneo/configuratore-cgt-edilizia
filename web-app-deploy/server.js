const path = require('path');
const express = require('express');
const port = process.env.PORT || 8097;
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
const createPdfPriceList = require('./pdf/createPdfPriceList');
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
const XLSX = require('xlsx');
const shared = require('./shared');

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

    app.get('/api/dropbox/*',
        requiresLogin,
        async function (req, res) {
            const path = decodeURIComponent(req.url.replace('/api/dropbox/', ''));
            const file = await dropbox.download(path);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-disposition': 'attachment;filename=' + file.name,
                'Content-Length': file.size
            });
            res.end(new Buffer(file.fileBinary, 'binary'));
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

    app.get('/api/price-list/',
        requiresLogin,
        async function (req, res) {
            const models = (req.query.models || '').split(',');
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`))[0];
            createPdfPriceList(res, models, dropbox.getDb(req.session.userAuth), user);
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
        requiresLogin,
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
        requiresLogin,
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

    app.post('/api/order/:table',
        requiresLogin,
        async function (req, res) {
            const table = req.params.table;
            const order = await mongo.rest.insert(table, Object.assign({ userId: req.session.userId }, req.body));
            const budget = await mongo.rest.update(table.replace('orders', 'budgets'), req.body.budgetId, { ordered: true });
            const dbx = dropbox.getDb(req.session.userAuth);
            const user = (await mongo.rest.get('users', `_id=${req.session.userId}`))[0];
            const orderDetails = XLSX.utils.json_to_sheet([
                { CAMPO: 'Cliente', VALORE: budget.client.name },
                { CAMPO: 'Modello macchina', VALORE: dbx.versions.find(v => v.id === budget.version).name },
                { CAMPO: 'Stato macchina', VALORE: 'Nuova' },
                { CAMPO: 'Prezzo vendita', VALORE: order.price },
                { CAMPO: 'Prezzo minimo vendita (TOTALE)', VALORE: shared.calculateTotal(budget, dbx) },
                { CAMPO: 'Valore permuta', VALORE: budget.exchange.value},
                { CAMPO: 'Supervalutazione permuta', VALORE: order.exchange.overvalue},
                { CAMPO: 'Data vendita', VALORE: order.exchange.date},
                { CAMPO: 'Disponibilità macchina', VALORE: order.exchange.availability},
                { CAMPO: 'Venditore', VALORE: `${user.name} ${user.surname} ${user.organization ? ` - ${user.organization}` : ''}`},
                { CAMPO: 'Documenti permuta', VALORE: order.exchange.documents},
                { CAMPO: 'Data prevista consegna macchina', VALORE: order.exchange.delivery},
                { CAMPO: 'Dichiarazione per sollevamento', VALORE: order.exchange.declaration},
                { CAMPO: 'Targatura', VALORE: order.exchange.plate},
                { CAMPO: 'Leasing - documenti consegnati a società leasing', VALORE: order.leasing.documents},
                { CAMPO: 'Leasing approvato', VALORE: order.leasing.approved},
                { CAMPO: 'Leasing - pagamento anticipo', VALORE: order.leasing.payment},
                { CAMPO: 'Consegna meccanico officina esterna', VALORE: order.exchange.mechanic},
                { CAMPO: 'Note', VALORE: order.exchange.notes}
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, orderDetails, 'Dettaglio Ordine');
            const data = budget.equipment.map(eId => {
                const eq = dbx.equipements.find(e => e.id === eId)
                return {
                    'Codice Articolo': eq.code,
                    'Descrizione Articolo': eq.name,
                    'Fornitore': eq.builder,
                    'SERIAL NUMBER': '',
                    'Data invio ordine': '',
                    'Disponibilita': '',
                    'Completamento allestimento': '',
                }
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Attrezzature');

            /* generate buffer */
            const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            const xlsxPath = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.xlsx`;
            fs.writeFileSync(xlsxPath, buf);
            const attachments = [{
                filename: 'Ordine.xlsx',
                path: xlsxPath
            }];
            attachments.push(...(await dropbox.getAttachments(table,budget, order)));
            mailer.send(createTemplate('order', {table, order, budget, user, dbx, attachments}));
            const date = '' + new Date().getFullYear() + (new Date().getMonth()+1) + new Date().getDate();
            dropbox.updload(`Dettaglio_ordine_${user.name}_${user.surname}_${date}.xlsx`, fs.readFileSync(xlsxPath, 'binary'), '/Ordini');
            res.send(order);
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

