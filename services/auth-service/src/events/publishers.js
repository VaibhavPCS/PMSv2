const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS } = require('@pms/constants');

let _producer = null;
const GetProducer = async () => {
    if (!_producer) _producer = await CreateProducer([process.env.KAFKA_BROKER]);
    return _producer;
};

