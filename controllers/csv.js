const fs = require('fs');
const csv = require('fast-csv');
const Measure = require('../lib/measure');
const debug = require('debug')('server:csv');
const _ = require('underscore');
const Device = require('../lib/Device');
const Status = require('http-status-codes');
const config = require('../config');
const replacements = Object.keys(config.replace);
const date = require('date-and-time');
const interval = require('interval-promise')

/*
 * Delete the temporary file
 */
function removeCsvFile(filename) {
    const path = __basedir + '/resources/static/assets/uploads/' + filename;

    fs.unlink(path, (err) => {
        if (err) {
            throw err;
        }
    });
}

/*
 * Read the CSV data from the temporary file.
 * This returns an in memory representation of the raw CSV file
 */
function readCsvFile(filename) {
    const path = __basedir + '/resources/static/assets/uploads/' + filename;

    var temp = filename.split('-')[1].split('_');

    temp = {
        "plant": temp[0],
        "property": temp[1]
    };

    return new Promise((resolve, reject) => {
        const rows = [];

        rows.push(temp);

        fs.createReadStream(path)
            .pipe(csv.parse({ headers: true, discardUnmappedColumns: true, delimiter: ';'}))
            .on('error', (error) => {
                reject(error.message);
            })
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', () => {
                resolve(rows);
            });
    });
}

/**
 * Retrieve the unitCode from the static data saved in a database.
 */
async function getDeviceUnitCode(id) {
    let data;
    const queryParams = {
        id: 'urn:ngsi-ld:Device:' + id
    };
    const query = Device.model.findOne(queryParams);

    try {
        data = await query.lean().exec();
    } catch (err) {
        debug('error: ' + err);
    }
    return data ? data.unitCode : undefined;
}

/*
 * Manipulate the CSV data to create a series of measures
 * The data has been extracted based on the headers and other
 * static data such as the unitCode.
 */
async function createMeasuresFromCsv(rows) {
    const headerInfo = [];
    const measures = [];

    measures.push({
        "plantId": rows[0].plant,
        "property": rows[0].property
    })

    rows.shift();

    // Get the list of keys discarding the last columns from the csv file, no data.
    const keys = Object.keys(rows[0]).toString().split(',').slice(0, 2);

    rows.forEach((row) => {
            const measure = {};

            keys.forEach((key) => {
                header = replacements.includes(key) ? config.replace[key] : key;
                measure[header] = row[key]
            })

            // We need to delete the spaces in the value, second element of the array and should be a float
            measure["value"] = parseFloat(measure["value"].replace(/\s+/g, '').replace(',', '.'));

            measures.push(measure);
        }

    );

    return measures;
}

/*
 * Take the in memory data and format it as NSGI Entities
 *
 */
function createEntitiesFromMeasures(measures) {
    const plantId = measures[0].plantId;
    const property = replacements.includes(measures[0].property) ? config.replace[measures[0].property] : measures[0].property;
    const entities = [];

    measures.shift();

    measures.forEach((measure) => {
        const entity = {};

        entity.location = {
            "type": "Address",
            "value": {
                "type": "areaServed",
                "value": plantId
            }
        };

        entity.type = 'WaterQualityObserved';
        entity.id = 'urn:ngsi-ld:WaterQualityObserved:waterqualityobserved:WWTP:' + plantId;

        //const d = new Date(measure.dateObserved);
        const d = date.parse(measure.dateObserved, 'DD/MM/YYYY HH:mm:ss');

        entity.dateObserved = {
            "type": "Property",
            "value": {
                "@type": "DateTime",
                "@value": d.toISOString()
            }
        };

        entity[property] = {
            "type": "Property",
            "value": measure.value,
            "unitCode": ""
        }

        entity['@context'] = [
            'https://schema.lab.fiware.org/ld/context',
            'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context.jsonld'
        ]


            entities.push(entity);
    });

    return entities;
}

/**
 * Sleep for some milliseconds
 * @param millis number of milliseconds to sleep
 * @returns {Promise<unknown>}
 */
function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

/*
 * Create an array of promises to send data to the context broker.
 * Each insert represents a series of readings at a given timestamp
 */
function createContextRequests(entities) {
    const promises = [];
    const scope = config.scope;

    // for testing I get only 5 elements
    entities = entities.slice(0,5);

    entities.forEach((entitiesAtTimeStamp) => {
        promises.push(Measure.sendAsHTTP(entitiesAtTimeStamp));
    });

    return promises;
}

/**
 * Actions when uploading a CSV file. The CSV file holds an array of
 * measurements each at a given timestamp.
 */
const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(Status.UNSUPPORTED_MEDIA_TYPE).send('Please upload a CSV file!');
    }

    return readCsvFile(req.file.filename)
        .then((rows) => {
            return createMeasuresFromCsv(rows);
        })
        .then((measures) => {
            removeCsvFile(req.file.filename);
            return createEntitiesFromMeasures(measures);
        })
        .then((entities) => {
            return createContextRequests(entities);
        })
        .then(async (promises) => {
            //return await Promise.allSettled(promises);
            // run seq the promises foreach... run promises and wait n seconds
            const delay = (milliseconds) => {
                console.log(`Waiting: ${milliseconds / 1000} seconds.`);
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve(milliseconds);
                    }, milliseconds);
                });
            }

            const startTime = Date.now();

            const doNextPromise = (d) => {
                delay(5000)

                    .then(x => {
                        console.log(`Waited: ${x / 1000} seconds\n`);
                        d++;

                        if (d < promises.length)
                            doNextPromise(d)
                        else
                            console.log(`Total: ${(Date.now() - startTime) / 1000} seconds.`);
                    })
            }

            await doNextPromise(0);
        })
        .then((results) => {
            const errors = _.where(results, { status: 'rejected' });
            return errors.length ? res.status(Status.BAD_REQUEST).json(errors) : res.status(Status.NO_CONTENT).send();
        })
        .catch((err) => {
            debug(err.message);
            return res.status(Status.INTERNAL_SERVER_ERROR).send(err.message);
        });
};

module.exports = {
    upload
};
