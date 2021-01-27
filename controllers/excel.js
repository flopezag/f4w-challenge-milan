// const readXlsxFile = require('read-excel-file/node');
const excel = require("fast-xlsx-reader");
const Measure = require('../lib/measure');
const config = require('../config');
const debug = require('debug')('server:excel');
const fs = require('fs');
const _ = require('underscore');
const moment = require('moment-timezone');
const Device = require('../lib/Device');
const replacements = Object.keys(config.replace);
const Status = require('http-status-codes');

/**
 * The UnitCode is held in the static data, but need to be sent as
 * meta data with each measurement.
 */
function storeDeviceUnitCode(id, unitCode) {
    const data = { unitCode };
    debug(data);
    try {
        Device.model.findOneAndUpdate({ id }, data, { upsert: true }, function (err) {
            if (err) {
                debug(err.message);
            }
        });
    } catch (err) {
        debug(err.message);
    }
}

/*
 * Delete the temporary file
 */
function removeXlsxFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            throw err;
        }
    });
}


/*
 * Read the XLS data from the temporary file.
 * This returns an in memory representation of the raw CSV file
 */
function readXlsFile(inputFile) {
    return new Promise((resolve, reject) => {
        const reader = excel.createReader({
            input: inputFile
        });

        const rows = reader.readMany(reader.startRow, reader.rowCount);

        // clean up
        reader.destroy();

        resolve(rows);
    })
}

/*
 * Capitalise each word in a string
 */
function titleCase(str) {
    const splitStr = str.toLowerCase().split(' ');

    for (var i = 1; i < splitStr.length; i++) {
        // You do not need to check if i is larger than splitStr length, as your for does that for you
        // Assign it back to the array
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }

    // Directly return the joined string without spaces
    return splitStr.join('');
}

/*
 * Manipulate the Excel data to create a series of entities
 */
function createEntitiesFromXlsx(rows) {
    const entities = [];

    const headerFields = _.map(rows[0], (header) => {
        const field = titleCase(header);
        return replacements.includes(field) ? config.replace[field] : field;
    });

    // skip header
    rows.shift();

    rows.forEach((row) => {
        const entity = {};

        headerFields.forEach((header, index) => {
            const value = row[index];
            if (!config.ignore.includes(value)) {
                entity[header] = {
                    type: 'Property',
                    value
                };
            }
        });

        entity.type = 'WaterQualityObserved';
        entity.id = 'urn:ngsi-ld:WaterQualityObserved:waterqualityobserved:WWTP:' + entity.id.value;
/*
        config.float.forEach((float) => {
            if (entity[float]) {
                entity[float].value = Number.parseFloat(entity[float].value);
            }
        });
        config.integer.forEach((integer) => {
            if (entity[integer]) {
                entity[integer].value = Number.parseFloat(entity[integer].value);
            }
        });
        config.datetime.forEach((datetime) => {
            if (entity[datetime]) {
                try {
                    entity[datetime].value = {
                        '@type': 'DateTime',
                        '@value': moment.tz(entity[datetime].value, 'Etc/UTC').toISOString()
                    };
                } catch (e) {
                    debug(e);
                }
            }
        });
        config.relationship.forEach((relationship) => {
            if (entity[relationship]) {
                entity[relationship] = {
                    type: 'Relationship',
                    object: 'urn:ngsi-ld:DeviceModel:' + String(entity[relationship].value)
                };
            }
        });

        // Code unit is to be stored as metadata
        if (entity.code_unit && entity.code_unit.value !== '-') {
            storeDeviceUnitCode(entity.id, entity.code_unit.value, (err) => {
                debug('stored device', err);
            });
            delete entity.code_unit;
        }
        */

        entities.push(entity);

    });

    return entities;
}

const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(Status.UNSUPPORTED_MEDIA_TYPE).send('Please upload an excel file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

    return readXlsFile(path)
        .then((rows) => {
            const entities = createEntitiesFromXlsx(rows);
            removeXlsxFile(path);
            return entities;
        })
        .then(async (entities) => {
            const cbResponse = await Measure.sendAsHTTP(entities);
            return res.status(cbResponse ? cbResponse.statusCode : 204).send();
        })
        .catch((err) => {
            return res.status(Status.INTERNAL_SERVER_ERROR).send(err);
        });
};

module.exports = {
    upload
};
