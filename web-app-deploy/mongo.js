const access = require('./private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const MongoStore = require('express-brute-mongo');
let text = process.env.APP_CONFIG || JSON.stringify(access.config);
const config = JSON.parse(text);
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;
const path = require('path');

function getObjectId(id) {
    try {
        return new ObjectID(id);
    } catch (e) {
        return e;
    }
}

function clean(o) {
    return Object.keys(o).reduce(function (ret, key) {
        ret[key] = o[key];
        if (typeof ret[key] === 'string') {
            ret[key] = o[key].trim();
        }
        if (key.indexOf('Id') !== -1 && o[key] !== '' && o[key] && o[key].toString().length <= 40) {
            try {
                ret[key] = getObjectId(o[key]);
            } catch (e) {
                ret[key] = o[key];
            }
        }
        return ret;
    }, {});
}

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
        });
    };

    obj.insertUser = function ({ email, password, tel = '', surname, type, organization, name, lang }) {
        return new Promise(function (resolve, rej) {
            db.collection('users').find({ email }).toArray(function (err, result) {
                if (err) return rej(new Error('generic'));
                if (result.length) return rej(new Error('existingUser'));
                const activationCode = bcrypt.hashSync(password, 4);
                const hash = bcrypt.hashSync(password, 10);
                const created = (new Date()).toISOString();
                const insert = { created, userAuth: 4, hash, activationCode, type, organization, surname, name, tel, email, active: false, lang };
                db.collection('users').insertOne(insert, function (err, res) {
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
                .collection('users')
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { active: true, userAuth, type: Math.max(Number(userAuth), 1) } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return rej(new Error('generic'));
                        if (r.value === null) return rej(new Error('generic'));
                        res(r.value);
                    });
        });
    };

    obj.getUser = function (data) {
        return new Promise(function (resolve, reject) {
            db.collection('users')
                .findOne(data, function (err, user) {
                    if (err) return reject(new Error('generic'));
                    if (!user) return reject(new Error('missingUser'));
                    resolve(user);
                });
        });
    };

    obj.recoverPassword = function (data) {
        return new Promise(function (resolve, reject) {
            db
                .collection('users')
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
                .collection('users')
                .findOneAndUpdate(
                    { activationCode },
                    { $set: { hash: bcrypt.hashSync(password, 10) } },
                    { returnOriginal: false },
                    function (err, r) {
                        if (err) return reject(new Error('generic'));
                        if (r.value === null) return reject(new Error('missingUser'));
                        resolve(r.value);
                    });
        });
    };

    obj.deleteUser = function ({ userId, password }) {
        return new Promise(async function (resolve, reject) {
            const { email, hash } = await obj.getUser({ _id: new ObjectID(userId) });
            if (!email) return reject(new Error('missingUser'));
            bcrypt.compare(password, hash, function (err, res) {
                if (err) return reject(new Error('generic'));
                if (!res) return reject(new Error('wrongPassword'));

                db
                    .collection('users')
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
        });
    };

    obj.loginUser = function ({ email, password }) {
        return new Promise(function (resolve, rej) {
            db
                .collection('users')
                .findOne({ email }, function (err, user) {
                    if (err) return rej(new Error('generic'));
                    if (!user) return rej(new Error('wrongEmail'));
                    if (!user.active) return rej(new Error('inactiveUser'));
                    bcrypt.compare(password, user.hash, function (err, res) {
                        if (err) return rej(new Error('generic'));
                        if (!res) return rej(new Error('wrongPassword'));
                        resolve(user);
                    });
                });
        });
    };

    obj.getUserData = function (userId) {
        return new Promise(function (resolve, reject) {
            db.collection('favourites').find({ userId, value: true }).toArray(function (err, res) {
                resolve(res.map(i => i.treatmentId));
            });
        });
    };

    obj.rest = {
        get: function (table, filter = '', {userId, userAuth}) {
            const find = {};
            const filters = filter.split('&');
            filters.forEach(f => {
                if (f.indexOf('>') !== -1) {
                    const tmp = f.split('>');
                    find[tmp[0]] = find[tmp[0]] || {};
                    find[tmp[0]]['$gt'] = Number(tmp[1]);
                }
                if (f.indexOf('<') !== -1) {
                    const tmp = f.split('<');
                    find[tmp[0]] = find[tmp[0]] || {};
                    find[tmp[0]]['$lt'] = Number(tmp[1]);
                }
                if (f.indexOf('=') !== -1) {
                    const tmp = f.split('=');
                    if (tmp[0].toLowerCase().indexOf('id') !== -1) {
                        try {
                            find[tmp[0]] = getObjectId(tmp[1]);
                        } catch (e) {
                            find[tmp[0]] = tmp[1];
                        }
                    } else {
                        find[tmp[0]] = tmp[1];
                    }
                }
            });
            if (userAuth.toString() !== '0') {
                find.userId = getObjectId(userId);
            }
            return new Promise(async function (resolve, rej) {
                db.collection(table).find(find).toArray(function (err, result) {
                    if (err) return rej(new Error('generic'));
                    resolve(result);
                });
            });
        },
        insert: function (table, body) {
            return new Promise(async function (resolve, rej) {
                const o = Object.assign({created: (new Date()).toISOString()}, body);
                db.collection(table).insertOne(clean(o), function (err, res) {
                    if (err)
                        rej(new Error('dbError'));
                    else {
                        const data = Object.assign({ _id: res.insertedId }, o);
                        resolve(data);
                    }
                });
            });
        },
        update: function (table, id, body, {userId, userAuth}) {
            return new Promise(async function (resolve, rej) {
                const o = Object.assign({modified: (new Date()).toISOString()}, body);
                const find = { _id: getObjectId(id) };
                if (userAuth.toString() !== '0') {
                    find.userId = getObjectId(userId);
                }
                db
                    .collection(table)
                    .findOneAndUpdate(
                        find,
                        { $set: clean(o) },
                        { returnOriginal: false },
                        function (err, r) {
                            if (err) return rej(new Error('generic'));
                            if (r.value === null) return rej(new Error('generic'));
                            resolve(r.value);
                        });
            });
        },
        delete: function (table, id, session) {
            return new Promise(async function (resolve, rej) {
                const item = await obj.rest.get(table, `_id=${id}`, session);
                if (!item) return rej('dbError');
                db.collection(table).remove({ _id: getObjectId(id) }, function (err, res) {
                    if (err)
                        rej(new Error('dbError'));
                    else {
                        resolve(item[0]);
                    }
                });
            });
        }
    };
    return obj;
};