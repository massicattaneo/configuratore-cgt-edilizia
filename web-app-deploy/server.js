const path = require('path');
const express = require('express');
const port = process.env.PORT || 8092;
const app = express();
const mailer = require("./mailer/mailer")();
const isDeveloping = process.env.NODE_ENV === "development";
const mongo = require("./mongo")(isDeveloping);
const bodyParser = require('body-parser');
const ExpressBrute = require('express-brute');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const LoginServices = require('./login-services');
const fs = require('fs');
const compression = require('compression');
const createPdfOrder = require('./pdf/createPdfOrder');
const https = require('https');
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname + '/private/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname + '/private/cert.pem'))
};

(async function () {
    const { store, db } = await mongo.connect();
    const bruteforce = new ExpressBrute(store);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(session({
        secret: 'configuratore-cgt-edilizia-hT1223S435sjdJ',
        resave: true,
        saveUninitialized: false,
        store: new MongoStore({
            db: db
        })
    }));
    app.use(compression());

    function requiresLogin(req, res, next) {
        if (req.session && req.session.userId) {
            return next();
        } else {
            res.send('anonymous');
        }
    }

    LoginServices({ app, mongo, mailer, bruteforce, requiresLogin });


    app.get('/api/public-db', async function (req, res) {
        res.send(Object.assign({}, { reviews: await mongo.getReviewsInfo() }));
    });

    app.get('/api/reviews/*', function (req, res) {
        const start = Number(req.url.substr(req.url.lastIndexOf('/') + 1)) * 3;
        mongo.reviewsList()
            .then(function (list) {
                res.send(list.splice(start, 3))
            })
            .catch(function (err) {
                res.error(500);
                res.send(err.message);
            })
    });

    app.post('/api/treatments/favourite',
        requiresLogin,
        function (req, res) {
            mongo.favouriteTreatment({
                treatmentId: req.body.id,
                value: req.body.value,
                userId: req.session.userId
            }).then(function () {
                res.send('ok')
            })
        });

    app.post('/api/reviews',
        requiresLogin,
        function (req, res) {
            mongo.insertReview({
                rate: req.body.rate,
                lang: req.body.lang,
                description: req.body.description,
                userId: req.session.userId,
            })
                .then(function (review) {
                    res.send(review)
                })
                .catch(function (err) {
                    res.error(500);
                    res.send(err.message);
                })
        });

    app.get('/api/pdf/*',
        async function (req, res) {
            const orderId = req.url.substr(req.url.lastIndexOf('/') + 1);
            const { cart } = await mongo.getOrderInfo(orderId);
            createPdfOrder(res, orderId, cart);
        });



    let callback;
    if (isDeveloping) {
        callback = require('../webpack/dev-server')(app, express);
    } else {
        app.use(express.static(__dirname + '/static'));
        callback = function response(req, res) {
            res.sendFile(path.join(__dirname, 'static/index.html'));
        }
    }
    app.get('*', callback);

    app.listen(port, () => {
        console.log('http server running at ' + port)
    });


    const httpsPort = 8093;
    https.createServer(httpsOptions, app).listen(httpsPort, () => {
        console.log('https server running at ' + httpsPort)
    });

})();

// const server = require('http').Server(app);
// const websocketPort = 8080;
// const io = require('socket.io')(server);
// io.listen(websocketPort);
// io.on('connection', function (socket) {
//     socket.on('onToggleCommentLocked', function (data) {
//         socket.broadcast.emit('onToggleCommentLocked', data);
//     });
// });
