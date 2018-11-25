const access = require('../web-app-deploy/private/mongo-db-access');
const MongoClient = require('mongodb').MongoClient;
const config = access.config;
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const url = `mongodb://${config.mongo.user}:${encodeURIComponent(access.password)}@${config.mongo.hostString}`;

MongoClient.connect(url, async function (err, db) {
    if (err) return;
    // const organization = 'CONC-032';
    // const dummy_id = ObjectId.createFromTime(new Date('2018-01-01 00:00:01').getTime()/1000);
    // const a = await db.collection('vehicleorders')
    //     .findOne({organization, userAuth: {$in: [3,4]},_id: {"$gte": dummy_id}}, {sort:{$natural:-1}});
    // console.log(a)

});
