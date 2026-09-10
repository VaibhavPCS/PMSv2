const Router = require('express').Router();
const path = require('path');
const multer = require('multer');
const { AuthenticateToken } = require('@pms/auth-middleware');
const { ValidateRequest, ImportTasksSchema } = require('@pms/validators');
const { ParsePreview, ImportTasks } = require('../controller/excel.controller');

const SPREADSHEET_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                          // .xls
    'text/csv',
    'application/csv',
];
const SPREADSHEET_EXTS = ['.xlsx', '.xls', '.csv'];

const Upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        // Cross-check both the declared mimetype AND the file extension.
        if (SPREADSHEET_MIMES.includes(file.mimetype) && SPREADSHEET_EXTS.includes(ext)) {
            return cb(null, true);
        }
        cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
    },
});

const HandleMulterError = (err, _req, res, next) => {
    if (err) return res.status(400).json({ status: 'fail', message: err.message || 'Upload error' });
    next();
};

Router.post('/tasks/parse-preview', AuthenticateToken, Upload.single('file'), HandleMulterError, ParsePreview);
Router.post('/tasks',               AuthenticateToken, ValidateRequest(ImportTasksSchema), ImportTasks);

module.exports = Router;
