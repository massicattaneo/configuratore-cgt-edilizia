const access = require('./private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const MongoStore = require('express-brute-mongo');
let text = process.env.APP_CONFIG || JSON.stringify(access.config);
const config = JSON.parse(text);
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;

module.exports = function (isDeveloping) {
    const obj = {};
    const url = isDeveloping ? `mongodb://localhost:27017/cgt-edilizia` : `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${config.mongo.hostString}`;
    let db;

    obj.connect = function () {
        return new Promise(function (res, rej) {
            const store = new MongoStore(function (ready) {
                MongoClient.connect(url, function (err, DB) {
                    if (err) {
                        rej(new Error('dbError'));
                    } else {
                        db = DB;
                        ready(db.collection('bruteforce-store'));
                        res({ store, db });
                    }
                });
            });
        })
    };

    obj.insertUser = function ({ email, password, tel = '', type, organization, name, lang }) {
        return new Promise(function (resolve, rej) {
            db.collection("users").find({ email }).toArray(function (err, result) {
                if (err) return rej(new Error('generic'));
                if (result.length) return rej(new Error('existingUser'));
                const activationCode = bcrypt.hashSync(password, 4);
                const hash = bcrypt.hashSync(password, 10);
                const insert = { hash, activationCode, type, organization, name, tel, email, active: false, lang };
                db.collection("users").insertOne(insert, function (err, res) {
                    if (err)
                        rej(new Error('dbError'));
                    else {
                        Object.assign(insert, { id: res.insertedId });
                        resolve(insert);
                    }
                });
            });
        });
    };

    obj.activateUser = function (activationCode, userAuth) {
        return new Promise(function (res, rej) {
            db
                .collection("users")
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { active: true, userAuth } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return rej(new Error('generic'));
                        if (r.value === null) return rej(new Error('generic'));
                        res(r.value);
                    })
        })
    };

    obj.getUser = function (data) {
        return new Promise(function (resolve, reject) {
            db.collection("users")
                .findOne(data, function (err, user) {
                    if (err) return reject(new Error('generic'));
                    if (!user) return reject(new Error('missingUser'));
                    resolve(user);
                });
        })
    };

    obj.recoverPassword = function (data) {
        return new Promise(function (resolve, reject) {
            db
                .collection("users")
                .findOneAndUpdate(
                    data,
                    { $set: { activationCode: bcrypt.hashSync('re$eTPas$W0Rd', 4) } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingUser'));
                        resolve(r.value);
                    });
        });
    };

    obj.resetPassword = function ({ activationCode, password }) {
        return new Promise(function (resolve, reject) {
            db
                .collection("users")
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { hash: bcrypt.hashSync(password, 10) } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingUser'));
                        resolve(r.value);
                    });
        })
    };

    obj.deleteUser = function ({ userId, password }) {
        return new Promise(async function (resolve, reject) {
            const { email, hash } = await obj.getUser({ _id: new ObjectID(userId) });
            if (!email) return reject(new Error('missingUser'));
            bcrypt.compare(password, hash, function (err, res) {
                if (err) return reject(new Error('generic'));
                if (!res) return reject(new Error('wrongPassword'));

                db
                    .collection("users")
                    .findOneAndUpdate(
                        { email },
                        { $set: { deleted: true, _email: email, email: '' } },
                        { returnOriginal: false },
                        function (err, r) {
                            if (err) return reject(new Error('generic'));
                            if (r.value === null) return reject(new Error('missingUser'));
                            resolve(r.value);
                        });
            });
        })
    };

    obj.loginUser = function ({ email, password }) {
        return new Promise(function (resolve, rej) {
            db
                .collection("users")
                .findOne({ email }, function (err, user) {
                    if (err) return rej(new Error('generic'));
                    if (!user) return rej(new Error('wrongEmail'));
                    if (!user.active) return rej(new Error('inactiveUser'));
                    bcrypt.compare(password, user.hash, function (err, res) {
                        if (err) return rej(new Error('generic'));
                        if (!res) return rej(new Error('wrongPassword'));
                        resolve(user);
                    });
                })
        })
    };

    obj.reviewsList = function () {
        return new Promise(function (resolve, reject) {
            db.collection("reviews").find({}, { limit: 100 }).sort({ created: -1 }).toArray(function (err, res) {
                resolve(res);
            })
        })
    };

    obj.insertReview = function ({ rate, description, userId, lang }) {
        return new Promise(async function (resolve, rej) {
            const { name } = await obj.getUser({ _id: new ObjectID(userId) }).catch(rej);
            db.collection("reviews").insertOne({
                name,
                rate,
                description,
                created: Date.now(),
                userId,
                lang
            }, function (err, res) {
                if (err)
                    rej(new Error('dbError'));
                else {
                    resolve(res.ops[0]);
                }
            });
        });
    };

    obj.favouriteTreatment = function ({ treatmentId, value, userId }) {
        db.collection('favourites').update({ treatmentId, userId }, { treatmentId, userId, value }, { upsert: true })
        return Promise.resolve();
    };

    obj.getUserData = function (userId) {
        return new Promise(function (resolve, reject) {
            db.collection("favourites").find({ userId, value: true }).toArray(function (err, res) {
                resolve(res.map(i => i.treatmentId));
            })
        })
    };

    obj.buy = function ({ cart, userId, amount, email }) {
        return new Promise(function (resolve, reject) {
            const doc = { userId, cart, email, amount, payed: false };
            db.collection("orders").insertOne(doc, function (err, res) {
                if (err)
                    reject(new Error('dbError'));
                else {
                    Object.assign(doc, { id: res.insertedId });
                    resolve(doc);
                }
            });
        });
    };

    obj.confirmBuy = function ({ id, stripeId, amount, last4 }) {
        return new Promise(function (resolve, reject) {
            db
                .collection("orders")
                .findOneAndUpdate(
                    { _id: id },
                    { $set: { payed: true, stripeId, amount, last4 } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingOrder'));
                        resolve(r.value);
                    });
        })
    };

    obj.getReviewsInfo = function () {
        const col = db.collection('reviews');
        return Promise.all([
            new Promise(async function (resolve, reject) {
                col.aggregate([{ $count: "count" }]).toArray(function (err, docs) {
                    if (err) return reject(new Error('generic'));
                    resolve(docs);
                });
            }),
            new Promise(async function (resolve, reject) {
                col.aggregate([{ $group: { _id: null, average: { $avg: "$rate" } } }]).toArray(function (err, docs) {
                    if (err) return reject(new Error('generic'));
                    resolve(docs);
                });
            })
        ]).then(function (array) {
            return { count: array[0][0].count, average: array[1][0].average };
        });
    };

    obj.getOrderInfo = function (id) {
        return new Promise(function (resolve, reject) {
            db.collection("orders")
                .findOne({ _id: new ObjectID(id) }, function (err, order) {
                    if (err) return reject(new Error('generic'));
                    if (!order) return reject(new Error('generic'));
                    resolve(order);
                });
        })
    };

    return obj;
};