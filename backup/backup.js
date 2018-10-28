var access = require('../web-app-deploy/private/mongo-db-access');
var backup = require('mongodb-backup');
var devUri = `mongodb://localhost:27017/cgt-edilizia`;
var prodUri = `mongodb://${access.config.mongo.user}:${encodeURIComponent(access.password)}@${access.config.mongo.hostString}`;
var restore = require('mongodb-restore');

backup({
    uri: prodUri,
    root: __dirname,
    callback: function () {
        restore({
            uri: devUri,
            root: __dirname + '/5531179cd70af3a9ab2a3d1120fd2235'
        });
    }
});

