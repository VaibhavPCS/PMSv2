const { APIError } = require('@pms/error-handler');

function ValidateTransition(definition, currentStage, toStage, userRole, payload, triggeredBy) {
  const transition = definition.transitions.find((t) => t.from === currentStage && t.to === toStage);
  if (!transition) {
    throw new APIError(400, `No transition defined from '${currentStage}' to '${toStage}'.`);
  }

  if (payload == null) {
    throw new APIError(400, 'Transition payload is required.');
  }

  const allowedRoles = Array.isArray(transition.allowedRoles) ? transition.allowedRoles : [];
  
  if (triggeredBy !== 'github_webhook' && !allowedRoles.includes(userRole)) {
    throw new APIError(403, 'Your role cannot perform this transition.');
  }

  if (transition.githubTrigger && triggeredBy !== 'github_webhook') {
    throw new APIError(400, 'This transition can only be triggered by a GitHub webhook.');
  }

  if (transition.requiresNote && !payload?.note?.trim()) {
    throw new APIError(400, 'A note is required for this transition.');
  }
  if (transition.requiresAttachment && !payload?.attachmentUrl?.trim()) {
    throw new APIError(400, 'An attachment is required for this transition.');
  }
  if (transition.requiresReferenceLink && !payload?.referenceLink?.trim()) {
    throw new APIError(400, 'A reference link is required for this transition.');
  }

  return transition;
}

module.exports = { ValidateTransition };