const Pino = require('pino');

const CreateLogger = (serviceName) => {
    const IsDev = process.env.NODE_ENV !== 'production';

    return Pino({
        level: process.env.LOG_LEVEL || 'info',
        base: { service: serviceName },
        transport: IsDev
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
    });
};

module.exports = { CreateLogger };