const config = {
    mongodb: 'mongodb://localhost:27017/iotagent-csv',
    contextBroker: {
        host: 'orion',
        port: '1026',
        jsonLdContext: 'http://csv-agent:3100/data-models/ngsi-context.jsonld'
    },
    replace: {
        'ph(ph)': 'pH',
        'conducibility': 'conductivity',
        'bod5': 'BOD',
        'cod': 'COD',
        'totalSuspendedSolids': 'TSS',
        'totalAmmoniaNitrogen(asNh4)': 'NH4',
        'nitrate(asn)': 'NO3',
        'phosphate(p-po4)': 'PO4',
        plants: 'id'
    },
    ignore: ['----', '>14.0', '<0.1', '<0.2', '<0.5', '<0.6', '<1', '<2', '<3', '<3.0', '<5', '<10', '<15'],
    float: ['x', 'y'],
    integer: ['position'],
    datetime: ['installation_time'],
    relationship: []
};

module.exports = config;



