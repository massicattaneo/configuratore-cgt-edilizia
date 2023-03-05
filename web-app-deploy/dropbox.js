require('isomorphic-fetch');
const privateInfo = require('./private/dropbox.json');
const DropboxTeam = require('dropbox').DropboxTeam;
const Dropbox = require('dropbox').Dropbox;
const XLSX = require('xlsx');
const fs = require('fs');
const { getEmptyDb } = require('./shared');
const originalDb = {};
const oldersDb = [];
const db = getEmptyDb();
const dbUA1 = {};
const dbUA2 = {};
const dbUA3 = {};
const dbUA4 = {};
const dbUA5 = getEmptyDb();
const dbUA6 = {};
const path = require('path');
const access = require('./private/mongo-db-access');
const backup = require('mongodb-backup');
const devUri = `mongodb://localhost:27017/cgt-edilizia`;
const prodUri = `mongodb://${access.config.mongo.user}:${encodeURIComponent(access.password)}@${access.config.mongo.hostString}`;
const nodeJsZip = require('nodeJs-zip');
const rimraf = require('rimraf');
const mailer = require('./mailer/mailer')();
const isDeveloping = process.env.NODE_ENV === 'development';

function uniqueTempFile(ext = 'pdf') {
    let fileName;
    do {
        fileName = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.${ext}`;
    } while (fs.existsSync(fileName));
    return fileName;
}

function convertCurrency(string) {
    return Number((string || '').replace(',', '').replace('€', '').trim());
}

function mapCompatibility(codice, item, row, db) {
    return db.models.map((model) => {
        const { id = '' } = model;
        if (!id) console.warn('MODEL WITHOUT ID', model);
        let modelIdNoSpace = id.replace(/\s/g, '').trim();
        const code = row[` ${modelIdNoSpace} `] || row[`${modelIdNoSpace}`];
        return code ? { id, code } : null;
    }).filter(i => i);
}

function convertAmericanDate(date) {
    if (!date) return '';
    const d = new Date(`20${date.split('/')[2]}`, Number(date.split('/')[0]) - 1, date.split('/')[1]);
    return isNaN(d.getTime()) ? '' : d.toISOString();
}

const retailersDataStructure = {
    id: 'IDENTIFICATORE',
    name: 'NOME',
    code: 'CODICE',
    address: 'INDIRIZZO',
    image: 'IMMAGINE'
};

const familyDataStructure = {
    id: 'Famiglia macchine',
    name: 'Famiglia estesa'
};
const modeldataStructure = {
    id: 'Modello',
    name: 'Modello',
    familyId: 'famiglia-modello',
    image: 'Immagine'
};
const versionDataStructure = {
    id: 'identificatore',
    name: 'Codice',
    modelId: 'Modello',
    description: { column: 'Macchina', convert: string => (string || '').replace('\n', '') },
    info: {
        column: 'Informazioni', convert: string => (string || '')
            .replace('\n', '').split('|').map(i => i.trim())
    },
    image: 'Nome immagine',
    notes: 'Note',
    attachment: 'Allegato offerta',
    priceListAttachment: {
        column: 'Allegato listino', convert: e => {
            if (!e) return '';
            return e.replace('Dropbox (CGTE)\\Apps\\configuratore-cgt-edilizia\\', '');
        }
    },
    depliants: {
        column: 'Depliants', convert: e => {
            if (!e) return '';
            return e.replace('Dropbox (CGTE)\\Apps\\configuratore-cgt-edilizia\\', '');
        }
    },
    priceReal: { column: 'Listino', convert: convertCurrency },
    priceMin: { column: 'Minimo', convert: convertCurrency },
    priceOutsource: { column: 'Prezzo concessionario', convert: convertCurrency },
    priceOriginalOutsource: { column: 'Prezzo concessionario', convert: convertCurrency },
    priceCGT: { column: 'Prezzo CGT', convert: convertCurrency },
    available: 'Disponibilit',
    time: 'Tempi da fabbrica',
    timeEurostock: 'Tempi da Eurostock'
};

const codes = {
    C: 'Compatibile',
    A: 'Performance accettabili ma non eccellenti',
    R: 'Restrizione sul sollevamento o sul carico operativo',
    Z: 'Consigliata zavorra supplementare',
    O: 'Omologata per circolazione stradale',
    S: 'Di serie',
    V: 'Verificare abbinamento con ufficio prodotto'
};

const equipementDataStructure = {
    code: 'Codice',
    name: 'Macchina/ Attrezzatura',
    info: { column: 'Informazioni', convert: e => e ? e : '' },
    notes: { column: 'Note', convert: e => e ? e : '' },
    image: 'Nome immagine',
    depliants: {
        column: 'Depliant', convert: e => {
            if (!e) return '';
            return e.replace('Dropbox (CGTE)\\Apps\\configuratore-cgt-edilizia\\', '');
        }
    },
    priceReal: { column: 'Listino', convert: convertCurrency },
    priceMin: { column: 'Minimo', convert: convertCurrency },
    priceOutsource: { column: 'Prezzo concessionario', convert: convertCurrency },
    priceOriginalOutsource: { column: 'Prezzo concessionario', convert: convertCurrency },
    priceCGT: { column: 'Prezzo CGT', convert: convertCurrency },
    familys: { column: 'Famiglia macchine', convert: string => (string || '').split('-') },
    equipmentFamily: 'Famiglia attrezzature',
    constructorId: 'Costruttore',
    time: 'Tempi da fabbrica',
    compatibility: { column: 'Codice', convert: mapCompatibility },
    id: 'Identificatore'
};

const stockMachinesDataStructure = {
    model: 'Nr. articolo',
    description: 'Descrizione',
    serialNumber: 'Seriale Macchina',
    foa: 'Ordine Acquisto',
    mso: 'Ordine Fornitore',
    manufactureDate: 'Anno/Mese Costr.Macch.',
    availability: 'Disponibilit',
    state: 'Stato',
    commented: { column: 'Commento', convert: item => item ? item : 'No' },
    specifications: {
        column: 'Caratteristica 1', convert: (item, ret, row, db) => {
            return [row[`Caratteristica 1`], row[`Caratteristica 2`], row[`Caratteristica 3`],
                row[`Caratteristica 4`], row[`Caratteristica 5`], row[`Caratteristica 6`]].join(', ');
        }
    },
    expectedEntryDate: { column: 'Data Prevista Entrata Merce', convert: convertAmericanDate },
    positioning: 'Presente in Magazzino'
};

const shopItemsDataStructure = {
    id: {
        column: 'codice', convert: (item, ret, row, db) => {
            return `${item}-${(row['prodotto'] || '').trim().replace(/\s/g, '_')}`;
        }
    },
    name: { column: 'nome', convert: (item = '', ret, row) => `${(row['codice'] || '').trim()} ${item}`.trim() },
    product: { column: 'prodotto', convert: (item = '') => item },
    subCategory: { column: 'sottocategoria', convert: (item = '') => item },
    type: { column: 'tipologia', convert: (item = '') => item },
    clothing: { column: 'vestiario', convert: (item = '') => item },
    sizes: { column: 'taglia', convert: (item = '') => item },
    genders: { column: 'genere', convert: (item = '') => item ? item.split(',').map(item => item.trim()) : [] },
    description: { column: 'descrizione', convert: (item = '') => item },
    images: {
        column: 'immagini', convert: (item = '', ret, row) => {
            return item.split(',')
                .map(item => item.trim())
                .filter(i => i)
                .map(item => `/shop_images/${row['prodotto'].trim()}/${item}`);
        }
    }
};

const shopProductsDataStructure = {
    id: 'codice',
    product: { column: 'prodotto', convert: (item = '') => item },
    seller: { column: 'venditore', convert: (item = '') => item },
    emails: { column: 'email', convert: (item = '') => item.split(',').map(item => item.trim()) }
};

const shopSizesDataStructure = {
    product: { column: 'prodotto', convert: (item = '') => item },
    clothing: { column: 'vestiario', convert: (item = '') => item },
    sizes: { column: 'none', convert: () => [] },
    sizesNumbers: { column: 'none', convert: () => [] },
    genders: { column: 'genere', convert: (item = '') => item },
    unit: { column: 'misura', convert: (item = '') => item }
};

function getDropboxSpecialOffers(dbx) {
    const paths = ['Venditori CGT Edilizia', 'CGT', 'Concessionari'];
    return Promise.all([
        dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Offerte speciali/${paths[0]}` }),
        dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Offerte speciali/${paths[1]}` }),
        dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Offerte speciali/${paths[2]}` })
    ])
        .then(function (responses) {
            const userAuths = [[0, 1], [0, 2], [0, 3]];
            return responses.reduce(function (arr, response, index) {
                return arr.concat(...response.entries.map(({ name, id }) => {
                    return {
                        name: (name || '').replace(/_/g, ' '), id,
                        userAuth: userAuths[index], href: `${paths[index]}/${name}`
                    };
                }));
            }, []);
        })
        .catch(function (error) {
            console.log(error);
        });
}

function removeReference(obj, array) {
    obj.versions.forEach(function (i) {
        array.forEach(function (key) {
            delete i[key];
        });
    });
    obj.equipements.forEach(function (i) {
        array.forEach(function (key) {
            delete i[key];
        });
    });
}

async function appendEquipments(db, mongo, userFamily) {
    const dbRet = Object.assign({}, db, {
        equipements: db.equipements?.concat(
            (await mongo.rest.get('equipments', `userFamily=${userFamily}`, { userAuth: 0 }))
                .filter(item => !item.isDeleted)
                .map(item => {
                    return Object.assign(item, { id: item._id.toString() });
                })
        )
    });
    return dbRet;
}

async function appendShopOrders(db, mongo, user) {
    const userAuth = 0;
    const dbRet = Object.assign({}, db, {
        shoporders: await mongo.rest.get('shoporders', Number(user.userAuth) ? `userId=${user._id}` : '', { userAuth })
    });
    return dbRet;
}

async function appendBudgetsOrders(db, mongo, user) {
    const userAuth = 0;
    const users = await mongo.getAllUsers();
    const dbRet = Object.assign({}, db, {
        vehiclebudgets: (await mongo.rest.get('vehiclebudgets', Number(user.userAuth) ? `userId=${user._id}` : '', { userAuth }))
            .filter(item => !item.isDeleted)
            .map(item => Object.assign(item, {
                id: item._id.toString(),
                user: users.find(u => u._id.toString() === item.userId.toString())
            })),
        equipmentbudgets: (await mongo.rest.get('equipmentbudgets', Number(user.userAuth) ? `userId=${user._id}` : '', { userAuth }))
            .filter(item => !item.isDeleted)
            .map(item => Object.assign(item, {
                id: item._id.toString(),
                user: users.find(u => u._id.toString() === item.userId.toString())
            })),
        vehicleorders: (await mongo.rest.get('vehicleorders', Number(user.userAuth) ? `userId=${user._id}` : '', { userAuth }))
            .filter(item => !item.isDeleted)
            .map(item => Object.assign(item, {
                id: item._id.toString(),
                user: users.find(u => u._id.toString() === item.userId.toString())
            })),
        equipmentorders: (await mongo.rest.get('equipmentorders', Number(user.userAuth) ? `userId=${user._id}` : '', { userAuth }))
            .filter(item => !item.isDeleted)
            .map(item => Object.assign(item, {
                id: item._id.toString(),
                user: users.find(u => u._id.toString() === item.userId.toString())
            }))
    });
    return dbRet;
}

function getDbVersion(db, date, userAuth = 0) {
    if (!date) return db;
    const timestamp = new Date(date).getTime();
    if (timestamp > db.timestamp) return db;
    const assign = Object.assign({}, oldersDb.find(d => timestamp > d.timestamp), { retailers: db.retailers });
    const ua = Number(userAuth);
    switch (ua) {
    case 1:
        removeReference(assign, ['priceOutsource', 'priceCGT', 'priceOriginalOutsource']);
        break;
    case 2:
        removeReference(assign, ['priceCGT', 'priceOutsource', 'priceOriginalOutsource']);
        break;
    case 3:
        removeReference(dbUA3, ['priceCGT', 'priceMin']);
        break;
    case 4:
        removeReference(dbUA4, ['priceCGT', 'priceMin', 'priceOriginalOutsource']);
        break;
    case 5:
        return { retailers: db.retailers }
        break;
    case 6:
        removeReference(dbUA6, ['priceReal', 'priceOutsource', 'priceCGT', 'priceMin', 'priceOriginalOutsource']);
        break;
    }
    return assign;
}

function removeShopItemsByProduct(db, products) {
    for (let i = 0; i < db.shopItems.length;) {
        const item = db.shopItems[i];
        if (!products.includes(item.product)) {
            db.shopItems.splice(i, 1);
        } else {
            i++;
        }
    }
}

module.exports = function (mongo) {
    const obj = {};
    const dbx = new Dropbox({ accessToken: privateInfo.accessToken });
    obj.init = async function () {
        /** create directories */
        if (!fs.existsSync(`${__dirname}/temp`)) fs.mkdirSync(`${__dirname}/temp`);
        if (!fs.existsSync(`${__dirname}/dpx-photos`)) fs.mkdirSync(`${__dirname}/dpx-photos`);
        if (!fs.existsSync(`${__dirname}/dpx-photos/shop_images`)) fs.mkdirSync(`${__dirname}/dpx-photos/shop_images`);

        let start = Date.now();
        console.log('/****** downloading/parsing CGT EDILIZIA SHOP DATABASE');
        const { shopSizes, shopItems, shopProducts } = await getShopDatabase(dbx);
        console.log(`/****** finished downloading/parsing CGT EDILIZIA SHOP DATABASE in ${(Date.now() - start) / 1000}s`);
        console.log('/****** downloading CGT EDILIZIA DROPBOX DATABASE');
        start = Date.now();
        console.log(`/****** finished downloading CGT EDILIZIA DROPBOX DATABASE in ${(Date.now() - start) / 1000}s`);
        const { actual, olders } = await getDbFromDropBox(dbx);
        Object.assign(originalDb, actual);
        oldersDb.push(...olders.map(function ({ db: thisDb, timestamp }) {
            const ret = {};
            ret.familys = parse('Famiglia Macchine', familyDataStructure, thisDb).filter(({ id }) => id.indexOf('-') === -1);
            ret.models = parse('Modelli', modeldataStructure, thisDb);
            ret.versions = parse('Listino macchine', versionDataStructure, thisDb);
            ret.equipements = parse('Listino attrezz. SSL-CTL-CWL', equipementDataStructure, thisDb);
            ret.equipements.push(...parse('Listino attrezzature MHE', equipementDataStructure, thisDb));
            ret.equipements.push(...parse('Listino attrezzature BHL', equipementDataStructure, thisDb));
            ret.equipements = ret.equipements.filter(i => i.code !== 'T').filter(i => i.code !== 'F');
            ret.timestamp = timestamp;
            return ret;
        }));
        Object.assign(originalDb, await getRetailersListFromDropBox(dbx));
        Object.assign(originalDb, await getNavisionDatabaseFromDropBox(dbx));
        start = Date.now();
        //stockManichesDataStructure
        // Object.assign(originalDb, await getFromXlsxFile());
        // Object.assign(originalDb, await getFromJSON());
        // fs.writeFileSync('./db.json', JSON.stringify(originalDb));
        console.log('/****** parsing CGT EDILIZIA DROPBOX DATABASE');
        Object.assign(db, { shopSizes, shopItems, shopProducts });
        db.familys = parse('Famiglia Macchine', familyDataStructure).filter(({ id }) => id.indexOf('-') === -1);
        db.models = parse('Modelli', modeldataStructure);
        db.vehicleAvailability = parse('vehicleAvailability', stockMachinesDataStructure)
            .filter(item => item.serialNumber)
            .filter(item => item.description.indexOf('--------') === -1)
            .filter(i => i.state.toUpperCase() !== 'IMPEGNATA PER VENDITA'
                || i.state.toUpperCase() !== 'OPZIONATA PER NOLEGGIO'
                || i.state.toUpperCase() !== 'OPZIONATA PER VENDITA');
        db.versions = parse('Listino macchine', versionDataStructure);
        db.equipements = parse('Listino attrezz. SSL-CTL-CWL', equipementDataStructure);
        db.equipements.push(...parse('Listino attrezzature MHE', equipementDataStructure));
        db.equipements.push(...parse('Listino attrezzature BHL', equipementDataStructure));
        db.equipements = db.equipements.filter(i => i.code !== 'T').filter(i => i.code !== 'F');
        db.codes = codes;
        db.timestamp = originalDb.timestamp;
        db.retailers = parse('Concessionari', retailersDataStructure);
        console.log(`/****** finished parsing CGT EDILIZIA DROPBOX DATABASE in ${(Date.now() - start) / 1000}s`);
        start = Date.now();
        console.log('/****** DOWNLOADING IMAGES FROM DROPBOX');
        await copyDropboxImages(dbx, db.models, db.versions, db.equipements, db.retailers);
        console.log('/****** CREATING SPECIAL OFFERS FROM DROPBOX');
        db.specialOffers = await getDropboxSpecialOffers(dbx);
        console.log(`/****** finished parsing DOWNLOADING IMAGES FROM DROPBOX in ${(Date.now() - start) / 1000}s`);
        Object.assign(dbUA1, JSON.parse(JSON.stringify(db)));
        Object.assign(dbUA2, JSON.parse(JSON.stringify(db)));
        Object.assign(dbUA3, JSON.parse(JSON.stringify(db)));
        Object.assign(dbUA4, JSON.parse(JSON.stringify(db)));
        Object.assign(dbUA5, { shopSizes, shopItems });
        Object.assign(dbUA6, JSON.parse(JSON.stringify(db)));
        removeReference(dbUA1, ['priceOutsource', 'priceCGT', 'priceOriginalOutsource']);
        removeShopItemsByProduct(dbUA1, ['Bandiere']);
        removeReference(dbUA2, ['priceCGT', 'priceOutsource', 'priceOriginalOutsource']);
        removeReference(dbUA3, ['priceCGT', 'priceMin']);
        removeReference(dbUA4, ['priceCGT', 'priceMin', 'priceOriginalOutsource']);
        removeReference(dbUA6, ['priceReal', 'priceOutsource', 'priceCGT', 'priceMin', 'priceOriginalOutsource']);
    };

    function changeDiscounts(o, user) {
        o.versions = o.versions?.map(function (i) {
            return Object.assign({}, i, {
                priceOutsource: Number(((i.priceOutsource / 100) * (100 + user.discount)).toFixed(2))
            });
        }) || [];
        o.equipements = o.equipements?.map(function (i) {
            return Object.assign({}, i, {
                priceOutsource: Number(((i.priceOutsource / 100) * (100 + user.discount)).toFixed(2))
            });
        }) || [];
        return o;
    }

    obj.getDb = async function (userAuth = 0, user = { discount: 0 }, timestamp) {
        const ua = Number(userAuth);
        switch (ua) {
        case 0:
            const useDb = getDbVersion(db, timestamp);
            const ret0 = await appendBudgetsOrders(await appendEquipments(useDb, mongo, 'CGTE'), mongo, user);
            return await appendShopOrders(ret0, mongo, user);
        case 1:
            const useDb1 = getDbVersion(dbUA1, timestamp);
            const ret1 = await appendBudgetsOrders(await appendEquipments(useDb1, mongo, 'CGTE'), mongo, user);
            return await appendShopOrders(ret1, mongo, user);
        case 2:
            const useDb2 = getDbVersion(dbUA2, timestamp);
            const ret2 = await appendBudgetsOrders(await appendEquipments(useDb2, mongo, 'CGT'), mongo, user);
            return await appendShopOrders(ret2, mongo, user);
        case 3:
            const useDb3 = getDbVersion(dbUA3, timestamp);
            const ret3 = await appendBudgetsOrders(changeDiscounts(await appendEquipments(useDb3, mongo, user.organization), user), mongo, user);
            return await appendShopOrders(ret3, mongo, user);
        case 4:
            const useDb4 = getDbVersion(dbUA4, timestamp);
            const ret4 = await appendBudgetsOrders(changeDiscounts(await appendEquipments(useDb4, mongo, user.organization), user), mongo, user);
            return await appendShopOrders(ret4, mongo, user);
        case 5:
            return await appendShopOrders(dbUA5, mongo, user);
        case 6:
            return dbUA6;
        }
    };

    obj.getAttachments = async function (table, budget, order) {
        const ret = [];
        if (table === 'vehiclebudgets') {
            const version = db.versions.find(v => v.id === budget.version);
            if (version.depliants) {
                const url = `/APPS/configuratore-cgt-edilizia/${(version.depliants || '').replace(/\\/g, '/')}.pdf`;
                const pdfSpecs = uniqueTempFile();
                await dbx.filesDownload({ path: url })
                    .catch(e => mailer.internalError(url))
                    .then(i => {
                        fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                        ret.push({ filename: `Depliant - ${i.name}`, path: pdfSpecs });
                    });
            }
            if (version.attachment) {
                const url = `/APPS/configuratore-cgt-edilizia/${(version.attachment || '').replace(/\\/g, '/')}.pdf`;
                const pdfSpecs = uniqueTempFile();
                await dbx.filesDownload({ path: url })
                    .catch(e => mailer.internalError(url))
                    .then(i => {
                        fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                        ret.push({ filename: 'Scheda Tecnica.pdf', path: pdfSpecs });
                    });
            }
        }
        if (table === 'vehiclebudgets' || table === 'equipmentbudgets') {
            const eqDepliants = budget.equipment
                .map(e => db.equipements.find(i => i.id === e) || {})
                .filter(e => e.depliants);
            if (eqDepliants.length) {
                await Promise.all(eqDepliants.map(async function (eq) {
                    const url = `/APPS/configuratore-cgt-edilizia/${(eq.depliants || '').replace(/\\/g, '/')}.pdf`;
                    const pdfSpecs = uniqueTempFile();
                    await dbx.filesDownload({ path: url })
                        .catch(e => mailer.internalError(url))
                        .then(i => {
                            fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                            ret.push({ filename: `Depliant - ${i.name}`, path: pdfSpecs });
                        });
                }));
            }
        }
        if (budget.files) {
            await Promise.all(budget.files.map(async function (file) {
                const url = `/APPS/configuratore-cgt-edilizia/Uploads/${file.url}`;
                const pdfSpecs = uniqueTempFile();
                await dbx.filesDownload({ path: url })
                    .catch(e => mailer.internalError(url))
                    .then(i => {
                        fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                        ret.push({ filename: file.name, path: pdfSpecs });
                    });
            }));
        }
        if (order && order.files) {
            await Promise.all(order.files.map(async function (file) {
                const url = `/APPS/configuratore-cgt-edilizia/Uploads/${file.url}`;
                const pdfSpecs = uniqueTempFile();
                await dbx.filesDownload({ path: url })
                    .catch(e => mailer.internalError(url))
                    .then(i => {
                        fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                        ret.push({ filename: file.name, path: pdfSpecs });
                    });
            }));
        }
        return ret;
    };

    obj.updload = function (fileName, file, subPath = '/Uploads') {
        return dbx.filesUpload({ path: `/APPS/configuratore-cgt-edilizia${subPath}/${fileName}`, contents: file })
            .then(function (response) {
                console.log('UPLOAD OK: ', response);
            })
            .catch(function (error) {
                console.error('UPLOAD ERROR: ', error);
            });
    };

    obj.delete = function (fileName, subPath = '/Uploads') {
        return dbx.filesDelete({ path: `/APPS/configuratore-cgt-edilizia${subPath}/${fileName}` })
            .then(function (response) {
                console.log('DELETE OK: ', response);
            })
            .catch(function (error) {
                console.error('DELETE ERROR: ', error);
            });
    };

    obj.download = function (path) {
        return downloadFile(dbx, path);
    };

    obj.backUpMongoDb = function () {
        if (!fs.existsSync(`${__dirname}/backup-db`)) fs.mkdirSync(`${__dirname}/backup-db`);
        if (!fs.existsSync(`${__dirname}/backup-db-zip`)) fs.mkdirSync(`${__dirname}/backup-db-zip`);
        backup({
            uri: prodUri,
            root: `${__dirname}/backup-db`,
            callback: async function (err) {
                if (err) {
                    console.error('ERROR DOING BACKUP', err);
                } else {

                    nodeJsZip.zip(`${__dirname}/backup-db`, {
                        dir: `${__dirname}/backup-db-zip`
                    });
                    await obj.updload(`${Date.now()}backup.zip`, fs.readFileSync(`${__dirname}/backup-db-zip/out.zip`, 'binary'), '/MongoDb-backup');
                    rimraf(`${__dirname}/backup-db/`, console.log);
                    rimraf(`${__dirname}/backup-db-zip/`, console.log);
                }
            }
        });
    };

    obj.uniqueTempFile = uniqueTempFile;

    obj.getDbVersion = getDbVersion;

    return obj;
};

const imageHash = Date.now();

async function copyDropboxImages(dbx, models, versions, equipments, retailers) {
    const filter = versions
        .map(v => v.image)
        .filter((img, i, a) => a.indexOf(img) === i);

    const filter2 = equipments
        .filter(i => i.image)
        .map(v => v.image)
        .filter((img, i, a) => a.indexOf(img) === i);

    const filter3 = retailers
        .filter(i => i.image)
        .map(v => v.image)
        .filter((img, i, a) => a.indexOf(img) === i);

    versions.forEach(function (version) {
        version.src = `/dpx-photos/image_${filter.indexOf(version.image)}.${imageHash}.jpg`;
    });

    equipments
        .filter(i => i.image)
        .forEach(function (eq) {
            eq.src = `/dpx-photos/image_${filter2.indexOf(eq.image) + 'eq'}.${imageHash}.jpg`;
        });

    retailers
        .filter(i => i.image)
        .forEach(function (eq) {
            eq.src = `/dpx-photos/image_${filter3.indexOf(eq.image) + 'ret'}.${imageHash}.jpg`;
        });

    models.forEach(function (model) {
        const version = versions.find(v => v.modelId === model.id);
        if (!version) console.log('NO VERSION FOUND FOR MODEL', model);
        model.src = version ? version.src : '';
    });

    const blankImage = fs.readFileSync(`${__dirname}/static/assets/images/blank-image.jpg`)

    const promise1 = filter
        .reduce(async function (previous, image, index) {
            await previous;
            const url = `/APPS/configuratore-cgt-edilizia/${(image || '').replace(/\\/g, '/')}.jpg`;
            return dbx.filesDownload({ path: url })
                .then(image => {
                    if (image && image.fileBinary) {
                        const fileName = `/dpx-photos/image_${index}.${imageHash}.jpg`;
                        fs.writeFileSync(`${__dirname}${fileName}`, image.fileBinary, { encoding: 'binary' });
                    }
                })
                .catch(function (e) {
                    const fileName = `/dpx-photos/image_${index}.${imageHash}.jpg`;
                    fs.writeFileSync(`${__dirname}${fileName}`, blankImage, { encoding: 'binary' });
                    console.log('MISSING', 'versions', url);
                });
        }, Promise.resolve());

    const promise2 = filter2
        .reduce(async function (previous, image, index) {
            await previous;
            const url = `/APPS/configuratore-cgt-edilizia/${(image || '').replace(/\\/g, '/')}.jpg`;
            return dbx.filesDownload({ path: url })
                .then(image => {
                    if (image && image.fileBinary) {
                        const idx = index + 'eq';
                        const fileName = `/dpx-photos/image_${idx}.${imageHash}.jpg`;
                        fs.writeFileSync(`${__dirname}${fileName}`, image.fileBinary, { encoding: 'binary' });
                    }
                })
                .catch(function (e) {
                    const fileName = `/dpx-photos/image_${index}.${imageHash}.jpg`;
                    fs.writeFileSync(`${__dirname}${fileName}`, blankImage, { encoding: 'binary' });
                    console.log('MISSING', 'equipments', url);
                });
        }, Promise.resolve());

    const promise3 = filter3
        .reduce(async function (previous, image, index) {
            await previous;
            const url = `/APPS/configuratore-cgt-edilizia/${(image || '').replace(/\\/g, '/')}.jpg`;
            return dbx.filesDownload({ path: url })
                .then(image => {
                    if (image && image.fileBinary) {
                        const idx = index + 'ret';
                        const fileName = `/dpx-photos/image_${idx}.${imageHash}.jpg`;
                        fs.writeFileSync(`${__dirname}${fileName}`, image.fileBinary, { encoding: 'binary' });
                    }
                })
                .catch(function (e) {
                    const fileName = `/dpx-photos/image_${index}.${imageHash}.jpg`;
                    fs.writeFileSync(`${__dirname}${fileName}`, blankImage, { encoding: 'binary' });
                    console.log('MISSING', 'retailers', url);
                });
        }, Promise.resolve());

        if(!isDeveloping) {
            await Promise.all([promise1, promise2, promise3])
        }
}

function downloadFile(dbx, path) {
    return dbx.filesDownload({ path: `/APPS/configuratore-cgt-edilizia/${path}` })
        .catch(function (e) {
            console.log(e);
        });
}

function parse(sheetName, data, theDb = originalDb) {
    return theDb[sheetName].map(function (row) {
        return Object.keys(data).reduce(function (ret, otherKey) {
            let datum = data[otherKey];
            if (!(datum instanceof Object)) {
                datum = { column: data[otherKey], convert: e => e };
            }
            const idKey = Object.keys(row).find(key => key.indexOf(datum.column) !== -1);
            ret[otherKey] = datum.convert(row[idKey] ? row[idKey].trim().replace(/\r/g, '') : row[idKey], ret, row, db);
            return ret;
        }, {});
    });
}

async function getShopDatabase(dbx) {
    return downloadFile(dbx, 'merchandising/database.xlsx')
        .then(async function (fileData) {
            const db = {};
            const read_opts = { type: '', raw: false, sheetRows: 0 };
            const workbook = XLSX.read(fileData.fileBinary, read_opts);
            workbook.SheetNames.forEach(function (name) {
                const workSheet = workbook.Sheets[name];
                db[name] = XLSX.utils.sheet_to_json(workSheet);
            });
            const shopSizes = parse('taglia', shopSizesDataStructure, db);
            const sizes = db.taglia.map(row => {
                return Object
                    .keys(row)
                    .filter(key => !['prodotto', 'genere', 'vestiario', 'misura'].includes(key))
                    .map(key => row[key]);
            });
            shopSizes.forEach((size, index) => {
                const items = sizes[index].map(i => i.split(':')[0]);
                const transforms = sizes[index].map(i => (i.split(':'))[1] || '');
                size.sizes.push(...items);
                size.sizesNumbers.push(...transforms);
            });
            const shopProducts = parse('prodotto', shopProductsDataStructure, db);
            shopProducts.forEach(function ({ product }) {
                if (!fs.existsSync(`${__dirname}/dpx-photos/shop_images/${product}`)) fs.mkdirSync(`${__dirname}/dpx-photos/shop_images/${product}`);
            });
            const shopItems = parse('articolo', shopItemsDataStructure, db);
            shopItems.forEach(function (item) {
                if (item.sizes && item.sizes.indexOf(',') !== -1) {
                    item.sizes = item.sizes.split(',').reduce((acc, i, index) => {
                        return Object.assign(acc, { [item.genders[index]]: i });
                    }, {});
                } else if (item.sizes) {
                    item.sizes = { [item.genders[0]]: item.sizes };
                } else {
                    item.sizes = {};
                }

                if (item.sizes) {
                    Object.keys(item.sizes)
                        .filter(key => item.sizes[key].indexOf('/') !== -1)
                        .forEach(key => {
                            const { unit } = shopSizes
                                .find(i => i.genders === key && i.clothing === item.clothing && i.product === item.product) || { unit: '' };
                            item.sizes[key] = item.sizes[key].split('/').map(i => `${i.trim()}${unit}`);
                        });
                    Object.keys(item.sizes)
                        .filter(key => item.sizes[key].indexOf('-') !== -1)
                        .forEach(key => {
                            const [from, to] = item.sizes[key].split('-');
                            const { sizes } = shopSizes
                                .find(i => i.genders === key && i.clothing === item.clothing && i.product === item.product) || { sizes: [] };
                            item.sizes[key] = sizes.filter((s, i, a) => i >= a.indexOf(from) && i <= a.indexOf(to));
                        });
                }
            });

            const allImages = shopItems.reduce((acc, item) => {
                return acc.concat(item.images.map(imagePath => ({ imagePath })));
            }, []);

            const images = await allImages
                .reduce(async function (previous, { imagePath }) {
                    await previous;
                    if (fs.existsSync(`${__dirname}/dpx-photos${imagePath}`)) return Promise.resolve();
                    const url = `/APPS/configuratore-cgt-edilizia/merchandising${imagePath}`;
                    console.warn(imagePath);
                    return new Promise(resolve => {
                        dbx.filesDownload({ path: url })
                        .then(image => {
                            if (image && image.fileBinary) {
                                const filePath = `/dpx-photos${imagePath}`;
                                fs.writeFileSync(`${__dirname}${filePath}`, image.fileBinary, { encoding: 'binary' });
                            }
                            resolve(image);
                        })
                        .catch(function (e) {
                            console.log('NOT FOUND', url);
                            resolve()
                        });
                    })
                }, Promise.resolve());

            return { shopSizes, shopItems, shopProducts };
        });
}

async function getDbFromDropBox(dbx) {
    const dbs = await dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Listini` })
        .then(async function (array) {
            const ret = [];
            await array.entries
                .reduce(async function (promise, item, index) {
                    await promise;
                    const ds = item.name.match(/db_([^.]*)\.xlsx/)[1];
                    const timestamp = new Date(`20${ds[0]}${ds[1]}-${ds[2]}${ds[3]}-${ds[4]}${ds[5]}`).getTime();
                    return dbx
                        .filesDownload({ path: `/APPS/configuratore-cgt-edilizia/Listini/${item.name}` })
                        .then((fileData) => {
                            const db = {};
                            const read_opts = {
                                type: '', //base64, binary, string, buffer, array, file
                                raw: false, //If true, plain text parsing will not parse values **
                                sheetRows: 0 //If >0, read the first sheetRows rows **
                            };
                            console.warn('PARSING', item.name, timestamp, new Date(timestamp));
                            const workbook = XLSX.read(fileData.fileBinary, read_opts);
                            workbook.SheetNames.forEach(function (name) {
                                const workSheet = workbook.Sheets[name];
                                db[name] = XLSX.utils.sheet_to_json(workSheet);
                            });
                            ret.push({ db, timestamp });
                            return Promise.resolve();
                        });
                }, Promise.resolve());
            return ret;
        });
    dbs.sort((a, b) => b.timestamp - a.timestamp);
    const resolved = dbs[0].db;
    resolved.timestamp = dbs[0].timestamp;
    return { actual: resolved, olders: dbs.slice(1) };
}

async function getRetailersListFromDropBox(dbx) {
    const fileData = await dbx.filesDownload({ path: '/APPS/configuratore-cgt-edilizia/ElencoConcessionari.xlsx' });
    const read_opts = {
        type: '', //base64, binary, string, buffer, array, file
        raw: false, //If true, plain text parsing will not parse values **
        sheetRows: 0 //If >0, read the first sheetRows rows **
    };
    const workbook = XLSX.read(fileData.fileBinary, read_opts);
    const name = workbook.SheetNames[0];
    const workSheet = workbook.Sheets[name];
    return {
        Concessionari: XLSX.utils.sheet_to_json(workSheet)
    };
}

async function getNavisionDatabaseFromDropBox(dbx) {
    const fileData = await dbx.filesDownload({ path: '/APPS/configuratore-cgt-edilizia/Estrazione_ZDispo/ZDISPO.xlsx' });
    const read_opts = {
        type: '', //base64, binary, string, buffer, array, file
        raw: false, //If true, plain text parsing will not parse values **
        sheetRows: 0 //If >0, read the first sheetRows rows **
    };
    const workbook = XLSX.read(fileData.fileBinary, read_opts);
    const workSheet = workbook.Sheets[workbook.SheetNames[0]];
    return {
        vehicleAvailability: XLSX.utils.sheet_to_json(workSheet)
    };
}

async function getFromXlsxFile() {
    const ret = {};
    const fileData = fs.readFileSync(__dirname + '/db.xlsx');
    // const fileData = await dbx.filesDownload({ path: '/APPS/configuratore-cgt-edilizia/db.xlsx' });
    const read_opts = {
        type: '', //base64, binary, string, buffer, array, file
        raw: false, //If true, plain text parsing will not parse values **
        sheetRows: 0 //If >0, read the first sheetRows rows **
    };
    const workbook = XLSX.read(fileData, read_opts);
    workbook.SheetNames.forEach(function (name) {
        const workSheet = workbook.Sheets[name];
        ret[name] = XLSX.utils.sheet_to_json(workSheet);
    });
    return ret;
}

async function getFromJSON() {
    return JSON.parse(fs.readFileSync(__dirname + '/db.json'));
}
