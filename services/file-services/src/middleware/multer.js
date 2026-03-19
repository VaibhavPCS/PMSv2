const multer = require('multer');
const { fileTypeFromBuffer } = require('file-type');
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

const ValidateFileContent = async (req, res, next) => {
  try {
    const files = [];

    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    if (req.files && !Array.isArray(req.files)) {
      Object.values(req.files).forEach((group) => files.push(...group));
    }

    for (const file of files) {
      const detected = await fileTypeFromBuffer(file.buffer);
      const detectedMime = detected?.mime || file.mimetype;

      if (!ALLOWED_FILE_TYPES.includes(detectedMime)) {
        return res.status(400).json({ status: 'fail', message: 'Uploaded file content type is not allowed' });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

const DefaultOptions = { storage: Storage, limits: Limits, fileFilter: FileFilter };

module.exports = {
  Upload,
  Middleware: {
    Single:   (fieldName)          => Upload.single(fieldName),
    Multiple: (fieldName, maxCount) => Upload.array(fieldName, maxCount ?? MAX_FILES_PER_UPLOAD),
    Fields:   (fields)             => Upload.fields(fields),
    Any:      ()                   => Upload.any(),
    Custom:   (options = {})       => {
      const mergedOptions = {
        ...DefaultOptions,
        ...options,
        storage: DefaultOptions.storage,
        limits: DefaultOptions.limits,
        fileFilter: DefaultOptions.fileFilter,
      };
      return multer(mergedOptions).any();
    },
    ValidateFileContent,
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
