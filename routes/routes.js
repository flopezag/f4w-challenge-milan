const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csv');
const excelController = require('../controllers/excel');
const upload = require('../lib/upload');

// Error Handling Helper Function
function asyncHelper(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
}

// Read and upload the .xls file from lab analysis data

router.post(
    '/real',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await csvController.upload(req, res);
    })
);


// Read and upload the .csv file from real measure data
router.post(
    '/lab',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await excelController.upload(req, res);
    })
);

module.exports = router;
