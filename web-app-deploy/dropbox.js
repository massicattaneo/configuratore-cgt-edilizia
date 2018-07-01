require('isomorphic-fetch');
const privateInfo = require('./private/dropbox.json');
const DropboxTeam = require('dropbox').DropboxTeam;
const Dropbox = require('dropbox').Dropbox;
const XLSX = require('xlsx');
const fs = require('fs');
const originalDb = {};
const db = {};
const path = require('path');

function convertCurrency(string) {
    return Number((string || '').replace(',', '').replace('€', '').trim());
}

function mapCompatibility(codice, item, row, db) {
    return db.models.map(({ id }) => {
        let modelIdNoSpace = id.replace(/\s/g, '').trim();
        const code = row[` ${modelIdNoSpace} `];
        return code ? { id, code } : null;
    }).filter(i => i);
}

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
    description: { column: 'Macchina', convert: string => string.replace('\n', '') },
    info: {
        column: 'Informazioni', convert: string => (string || '')
            .replace('\n', '').split('|').map(i => i.trim())
    },
    image: 'Nome immagine',
    notes: 'Note',
    attachment: 'Allegato offerta',
    depliants: {
        column: 'Depliants', convert: e => {
            if (!e) return '';
            return e.replace('Dropbox (CGTE)\\Apps\\configuratore-cgt-edilizia\\', '');
        }
    },
    priceReal: { column: 'Listino', convert: convertCurrency },
    priceMin: { column: 'Minimo', convert: convertCurrency },
    priceOutsource: { column: 'Prezzo concessionario', convert: convertCurrency },
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
    info: 'Informazioni',
    notes: 'Note',
    image: 'Nome immagine',
    priceReal: { column: 'Listino', convert: convertCurrency },
    priceMin: { column: 'Minimo', convert: convertCurrency },
    priceOutsource: { column: 'Prezzo concessionario', convert: convertCurrency },
    priceCGT: { column: 'Prezzo CGT', convert: convertCurrency },
    familys: { column: 'Famiglia macchine', convert: string => string.split('-') },
    equipmentFamily: 'Famiglia attrezzature',
    constructorId: 'Costruttore',
    time: 'Tempi da fabbrica',
    compatibility: { column: 'Codice', convert: mapCompatibility },
    id: 'Identificatore'
};

function getDropboxSpecialOffert(dbx) {
    const paths = ['Venditori', 'CGT', 'Concessionari'];
    return Promise.all([
        dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Offerte speciali/${paths[0]}` }),
        dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Offerte speciali/${paths[1]}` }),
        dbx.filesListFolder({ path: `/APPS/configuratore-cgt-edilizia/Offerte speciali/${paths[2]}` })
    ])
        .then(function (responses) {
            const userAuths = [[0, 1], [0, 2], [0, 3]];
            return responses.reduce(function (arr, response, index) {
                return arr.concat(...response.entries.map(({ name, id }) => {
                    return { name: name.replace(/_/g, ' '), id,
                        userAuth: userAuths[index], href: `${paths[index]}/${name}` };
                }));
            }, []);
        })
        .catch(function (error) {
            console.log(error);
        });
}

module.exports = function () {
    const obj = {};
    const dbx = new Dropbox({ accessToken: privateInfo.accessToken });
    obj.init = async function () {

        console.log('/****** downloading CGT EDILIZIA DROPBOX DATABASE');
        let start = Date.now();
        Object.assign(originalDb, await getFromDropBox(dbx));
        console.log(`/****** finished downloading CGT EDILIZIA DROPBOX DATABASE in ${(Date.now() - start) / 1000}s`);

        start = Date.now();
        console.log('/****** parsing CGT EDILIZIA DROPBOX DATABASE');
        // Object.assign(originalDb, await getFromXlsxFile());
        // Object.assign(originalDb, await getFromJSON());
        // fs.writeFileSync('./db.json', JSON.stringify(originalDb));
        db.familys = parse('Famiglia Macchine', familyDataStructure).filter(({ id }) => id.indexOf('-') === -1);
        db.models = parse('Modelli', modeldataStructure);
        db.versions = parse('Listino macchine', versionDataStructure);
        db.equipements = parse('Listino attrezz. SSL-CTL-CWL', equipementDataStructure);
        db.equipements.push(...parse('Listino attrezzature MHE', equipementDataStructure));
        db.equipements.push(...parse('Listino attrezzature BHL', equipementDataStructure));
        db.equipements = db.equipements.filter(i => i.code !== 'T').filter(i => i.code !== 'F');
        db.codes = codes;
        console.log(`/****** finished parsing CGT EDILIZIA DROPBOX DATABASE in ${(Date.now() - start) / 1000}s`);
        start = Date.now();
        console.log('/****** DOWNLOADING IMAGES FROM DROPBOX');
        await copyDropboxImages(dbx, db.models, db.versions, db.equipements);
        console.log('/****** CREATING SPECIAL OFFERS FROM DROPBOX');
        db.specialOffers = await getDropboxSpecialOffert(dbx);
        console.log(`/****** finished parsing DOWNLOADING IMAGES FROM DROPBOX in ${(Date.now() - start) / 1000}s`);
    };

    obj.getDb = function () {
        return db;
    };

    obj.getAttachments = async function (table, budget, order) {
        const ret = [];
        if (table === 'vehiclebudgets') {
            const version = db.versions.find(v => v.id === budget.version);
            if (version.depliants) {
                const url = `/APPS/configuratore-cgt-edilizia/${version.depliants.replace(/\\/g, '/')}.pdf`;
                if (!fs.existsSync(`${__dirname}/temp`)) fs.mkdirSync(`${__dirname}/temp`);
                const pdfSpecs = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.pdf`;
                const i = await dbx.filesDownload({ path: url });
                fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                ret.push({ filename: 'Depliants.pdf', path: pdfSpecs });
            }
            if (version.attachment) {
                const url = `/APPS/configuratore-cgt-edilizia/${version.attachment.replace(/\\/g, '/')}.pdf`;
                if (!fs.existsSync(`${__dirname}/temp`)) fs.mkdirSync(`${__dirname}/temp`);
                const pdfSpecs = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.pdf`;
                const i = await dbx.filesDownload({ path: url });
                fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                ret.push({ filename: 'Scheda Tecnica.pdf', path: pdfSpecs });
            }
        }
        if (budget.files) {
            await Promise.all(budget.files.map(async function (file) {
                const url = `/APPS/configuratore-cgt-edilizia/Uploads/${file.url}`;
                const pdfSpecs = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.pdf`;
                const i = await dbx.filesDownload({ path: url });
                fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                ret.push({ filename: file.name, path: pdfSpecs });
            }));
        }
        if (order && order.files) {
            await Promise.all(order.files.map(async function (file) {
                const url = `/APPS/configuratore-cgt-edilizia/Uploads/${file.url}`;
                const pdfSpecs = `${__dirname}/temp/${Math.round(Math.random() * 1e16).toString()}.pdf`;
                const i = await dbx.filesDownload({ path: url });
                fs.writeFileSync(pdfSpecs, i.fileBinary, { encoding: 'binary' });
                ret.push({ filename: file.name, path: pdfSpecs });
            }));
        }
        return ret;
    };

    obj.updload = function (fileName, file, subPath = '/Uploads') {
        dbx.filesUpload({ path: `/APPS/configuratore-cgt-edilizia${subPath}/${fileName}`, contents: file })
            .then(function (response) {
                console.log(response);
            })
            .catch(function (error) {
                console.error(error);
            });
    };

    obj.download = function (path) {
        return downloadFile(dbx, path);
    };

    return obj;
};

async function copyDropboxImages(dbx, models, versions, equipements) {
    const filter = versions
        .map(v => v.image)
        .filter((img, i, a) => a.indexOf(img) === i);

    const filter2 = equipements
        .filter(i => i.image)
        .map(v => v.image)
        .filter((img, i, a) => a.indexOf(img) === i);

    if (!fs.existsSync(`${__dirname}/dpx-photos`)) {
        fs.mkdirSync(`${__dirname}/dpx-photos`);
    }

    const images = await Promise.all(filter
        .map(function (image) {
            const url = `/APPS/configuratore-cgt-edilizia/${image.replace(/\\/g, '/')}.jpg`;
            return dbx.filesDownload({ path: url })
                .catch(function (e) {
                    console.log(url);
                });
        }));

    const images2 = await Promise.all(filter2
        .map(function (image) {
            const url = `/APPS/configuratore-cgt-edilizia/${image.replace(/\\/g, '/')}.jpg`;
            return dbx.filesDownload({ path: url })
                .catch(function (e) {
                    console.log(url);
                });
        }));

    images.forEach(function (image, index) {
        const fileName = `/dpx-photos/image_${index}.jpg`;
        fs.writeFileSync(`${__dirname}${fileName}`, image.fileBinary, { encoding: 'binary' });
    });

    images2.forEach(function (image, index) {
        const idx = index + images.length;
        const fileName = `/dpx-photos/image_${idx}.jpg`;
        fs.writeFileSync(`${__dirname}${fileName}`, image.fileBinary, { encoding: 'binary' });
    });

    versions.forEach(function (version) {
        version.src = `/dpx-photos/image_${filter.indexOf(version.image)}.jpg`;
    });

    equipements
        .filter(i => i.image)
        .forEach(function (eq) {
            eq.src = `/dpx-photos/image_${filter2.indexOf(eq.image) + filter.length}.jpg`;
        });

    models.forEach(function (model) {
        const version = versions.find(v => v.modelId === model.id);
        model.src = version.src;
    });
}

function downloadFile(dbx, path) {
    return dbx.filesDownload({ path: `/APPS/configuratore-cgt-edilizia/${path}` })
        .catch(function (e) {
            console.log(e);
        });
}

function parse(sheetName, data) {
    return originalDb[sheetName].map(function (row) {
        return Object.keys(data).reduce(function (ret, otherKey) {
            let datum = data[otherKey];
            if (!(datum instanceof Object)) {
                datum = { column: data[otherKey], convert: e => e };
            }
            const idKey = Object.keys(row).find(key => key.indexOf(datum.column) !== -1);
            ret[otherKey] = datum.convert(row[idKey] ? row[idKey].trim() : row[idKey], ret, row, db);
            return ret;
        }, {});
    });
}

async function getFromDropBox(dbx) {
    const ret = {};
    const fileData = await dbx.filesDownload({ path: '/APPS/configuratore-cgt-edilizia/db.xlsx' });
    const read_opts = {
        type: '', //base64, binary, string, buffer, array, file
        raw: false, //If true, plain text parsing will not parse values **
        sheetRows: 0, //If >0, read the first sheetRows rows **
    };
    const workbook = XLSX.read(fileData.fileBinary, read_opts);
    workbook.SheetNames.forEach(function (name) {
        const workSheet = workbook.Sheets[name];
        ret[name] = XLSX.utils.sheet_to_json(workSheet);
    });
    return ret;
}

async function getFromXlsxFile() {
    const ret = {};
    const fileData = fs.readFileSync(__dirname + '/db.xlsx');
    // const fileData = await dbx.filesDownload({ path: '/APPS/configuratore-cgt-edilizia/db.xlsx' });
    const read_opts = {
        type: '', //base64, binary, string, buffer, array, file
        raw: false, //If true, plain text parsing will not parse values **
        sheetRows: 0, //If >0, read the first sheetRows rows **
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
