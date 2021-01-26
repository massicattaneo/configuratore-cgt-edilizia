const fs = require('fs');
const fetch = require('node-fetch');
const { lineaVerdeAccessToken } = require('./private/privateInfo.json');

const familiesUrl = 'https://dzone.cgt.it/api/ngv/test/SalePriceList/Machineries/Families';
const modelsUrl = 'https://dzone.cgt.it/api/ngv/test/SalePriceList/Machineries/Models';
const versionsUrl = 'https://dzone.cgt.it/api/ngv/test/SalePriceList/Machineries/Versions';
const equipmentsUrl = 'https://dzone.cgt.it/api/ngv/test/SalePriceList/Machineries/Equipments';

const convertToString = item => item ? item.toString() : '';
const LINEA_VERDE_TABLES = {
    FAMILIES: {
        url: familiesUrl,
        id: 'FAMILIES',
        mapping: { id: { map: 'code', convert: convertToString }, name: { map: 'description' } }
    },
    MODELS: {
        url: modelsUrl,
        id: 'MODELS',
        mapping: {
            'id': { map: 'code', convert: convertToString },
            'name': { map: 'description' },
            'familyId': { map: 'familyCode', convert: convertToString },
            'src': { map: 'imagePath' }
        }
    },
    VERSIONS: {
        url: versionsUrl, id: 'VERSIONS', mapping: {
            'id': { map: 'id', convert: convertToString },
            'name': { map: 'title' },
            'modelId': { map: 'modelCode', convert: convertToString },
            'description': { map: 'description' },
            'info': { map: 'info' },
            'image': { map: 'description' },
            'notes': { map: 'notes' },
            'attachment': { map: 'attachment' },
            'priceListAttachment': { map: 'priceListAttachment' },
            'depliants': { map: 'depliants' },
            'priceReal': { map: 'priceReal', default: 0 },
            'priceMin': { map: 'priceMin', default: 0 },
            'priceOutsource': { map: 'priceOutsource', default: 0 },
            'priceOriginalOutsource': { map: 'priceOriginalOutsource', default: 0 },
            'priceCGT': { map: 'priceCGT', default: 0 },
            'available': { map: 'available' },
            'time': { map: 'time' },
            'timeEurostock': { map: 'timeEurostock' },
            'src': { map: 'imagePath' }
        }
    },
    EQUIPMENTS: {
        url: equipmentsUrl, id: 'EQUIPMENTS', mapping: {
            'code': { map: 'code', convert: convertToString },
            'name': { map: 'name' },
            'info': { map: 'info' },
            'notes': { map: 'notes' },
            'depliants': { map: 'depliants' },
            'priceReal': { map: 'price', default: 0 },
            'priceMin': { map: 'price', default: 0 },
            'priceOutsource': { map: 'price', default: 0 },
            'priceOriginalOutsource': { map: 'price', default: 0 },
            'priceCGT': { map: 'price', default: 0 },
            'familys': { map: 'familys', convert: convertToString },
            'equipmentFamily': { map: 'equipmentFamily', convert: convertToString },
            'constructorId': { map: 'constructorId', convert: convertToString },
            'time': { map: 'time' },
            'compatibility': {
                map: 'compatibility',
                convert: function (list) {
                    return list.map(item => ({ id: convertToString(item.versionCode), code: item.compatibilityType }));
                }
            },
            'id': { map: 'code' }
        }
    }
};

const getValue = (convertedValue, defaultValue) => {
    if (convertedValue) return convertedValue;
    if (defaultValue || defaultValue === 0) return defaultValue
    return '';
};

const mapTableFields = function (mapping) {
    return list => list
        .map(function (item) {
            return Object.keys(mapping).reduce(function (acc, key) {
                const mappedElement = mapping[key];
                const lineaVerdeValue = item[mappedElement.map];
                const defaultValue = mappedElement.default;
                const convertedValue = (mappedElement.convert && lineaVerdeValue) ? mappedElement.convert(lineaVerdeValue) : lineaVerdeValue;
                return Object.assign(acc, { [key]: getValue(convertedValue, defaultValue) });
            }, {});
        });
};

const getFromLineaVerde = table => {
    return fetch(table.url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-access-token': lineaVerdeAccessToken
        }
    })
        .then(res => res.json())
        .then(mapTableFields(table.mapping));
};

// (async function () {
//     const table = LINEA_VERDE_TABLES.VERSIONS;
//     const result = await getFromLineaVerde(table);
//     fs.writeFileSync(`${__dirname}/linea-verde/${table.id}.json`, JSON.stringify(result, null, 4), 'utf8');
// })();

module.exports = { getFromLineaVerde, LINEA_VERDE_TABLES };

