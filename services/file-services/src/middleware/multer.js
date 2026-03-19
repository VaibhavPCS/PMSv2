const multer = require('multer');
const { MAX_FILE_SIZE, MAX_FILES_PER_UPLOAD, ALLOWED_FILE_TYPES } = require('@pms/constants');

const Storage = multer.memoryStorage();
const Limits   = { fileSize: MAX_FILE_SIZE };

const FileFilter = (req, file, cb) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const Upload = multer({ storage: Storage, limits: Limits, fileFilter: FileFilter });

module.exports = {
  Upload,
  Middleware: {
    Single:   (fieldName)          => Upload.single(fieldName),
    Multiple: (fieldName, maxCount) => Upload.array(fieldName, maxCount ?? MAX_FILES_PER_UPLOAD),
    Fields:   (fields)             => Upload.fields(fields),
    Any:      ()                   => Upload.any(),
    Custom:   (options)            => multer(options).any(),
  },
  ErrorHandler: {
    MulterError: (err, req, res, next) => {
      if (err instanceof multer.MulterError) {
        let message = 'File upload error';

        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            message = `File size exceeds the allowed limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`;
            break;
          case 'LIMIT_FILE_COUNT':
            message = `Too many files — maximum ${MAX_FILES_PER_UPLOAD} allowed`;
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
          default:
            message = err.message || message;
        }

        return res.status(400).json({ status: 'fail', message });
      } else if (err) {
        return res.status(400).json({ status: 'fail', message: err.message || 'File upload error' });
      }

      next();
    },
  },
};
