const config = {
    mongodb: 'mongodb://localhost:27017/iotagent-csv',
    contextBroker: {
        host: 'orion',
        port: '1026',
        jsonLdContext: 'http://csv-agent:3100/data-models/ngsi-context.jsonld'
    },
    replace: {
        'cod': 'COD',
        'totalSuspendedSolids': 'tss',
        'totalAmmoniaNitrogen(asNh4)': 'NH4',
        'nitrate(asn)': 'NO3',
        'phosphate(p-po4)': 'PO4',
        'plant': 'id',
        'date': 'dateObserved',
        'Data/Ora': 'dateObserved',
        'Valore': 'value'
    },
    ignoreColLab: ['WHEIGHTED', 'KIND OF SAMPLING', 'N PROTOCOL', 'EVENT NOTE', 'NOTE', 'pH (PH)',
        'Conducibility', 'BOD5', 'Total Nitrogen (as N)', 'Total ammonia nitrogen (as N)',
        'nitrite (as N)', 'Total Phosphorus (as P)'
    ],
    ignore: ['', '----', 'ND', '>14.0'],
    mean: {
        '<0.1': 0.05,
        '<0.2': 0.01,
        '<0.5': 0.25,
        '<0.6': 0.3,
        '<1': 0.5,
        '<2': 1,
        '<3': 1.5,
        '<3.0': 1.5,
        '<5': 2.5,
        '<10': 5,
        '<15': 7.5
    },
    unitCode: {
        "flowRate": "MQS",
        "COD": "M1",
        "tss": "M1",
        "NH4": "M1",
        "NO3": "M1",
        "PO4": "M1",
    },
    datetime: ['dateObserved'],
    relationship: []
};

module.exports = config;



