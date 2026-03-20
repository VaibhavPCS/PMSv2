const { CreateProducer, PublishEvent } = require('@pms/kafka');
const { TOPICS }                       = require('@pms/constants');

let _producer = null;
const getProducer = async () => {
  if (!_producer) {
    _producer = CreateProducer([process.env.KAFKA_BROKER]);
  }

  const current = _producer;
  try {
    return await current;
  } catch (err) {
    if (_producer === current) {
      _producer = null;
    }
    throw err;
  }
};

const PublishMeetingCreated = (meeting) => getProducer().then((producer) =>
  PublishEvent(producer, TOPICS.MEETING_EVENTS, meeting.id, {
    type: 'MEETING_CREATED',
    meetingId: meeting.id,
    workspaceId: meeting.workspaceId,
    title: meeting.title,
    startTime: meeting.startTime,
    participantIds: (meeting.participants || []).map((p) => p.userId),
    timestamp: Date.now(),
  })
);

module.exports = {
  PublishMeetingCreated,
};