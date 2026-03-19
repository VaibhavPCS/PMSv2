const prisma = require('../config/prisma');

const TEMPLATES = [
  {
    name:        'Software Development Lifecycle',
    description: 'Full SDLC: Backlog → BA → Design → Design QA → Dev → Code Review → QA → Deploy → Done',
    isBuiltIn:   true,
    definition:  {
      initialStage:   'backlog',
      terminalStages: ['done', 'rejected'],
      stages: [
        { id: 'backlog',      label: 'Backlog',             color: '#94a3b8' },
        { id: 'ba-analysis',  label: 'BA Analysis',         color: '#60a5fa' },
        { id: 'design',       label: 'UI/UX Design',        color: '#818cf8' },
        { id: 'ui-review',    label: 'Design QA Review',    color: '#f472b6' },
        { id: 'development',  label: 'Development',         color: '#34d399' },
        { id: 'code-review',  label: 'Code Review',         color: '#fbbf24' },
        { id: 'qa-testing',   label: 'QA Testing',          color: '#fb923c' },
        { id: 'deployment',   label: 'DevOps / Deployment', color: '#2dd4bf' },
        { id: 'done',         label: 'Done',                color: '#4ade80' },
        { id: 'rejected',     label: 'Rejected',            color: '#f87171' },
      ],
      transitions: [
        { from: 'backlog',      to: 'ba-analysis',  label: 'Assign to BA',                  allowedRoles: ['admin', 'project-lead'], autoAssignRole: 'business-analyst' },
        { from: 'ba-analysis',  to: 'design',       label: 'BA Sign-off',                   allowedRoles: ['business-analyst', 'admin'], requiresNote: true, autoAssignRole: 'designer' },
        { from: 'design',       to: 'ui-review',    label: 'Submit for Design QA',          allowedRoles: ['designer'], requiresAttachment: true, autoAssignRole: 'qa' },
        { from: 'ui-review',    to: 'development',  label: 'Design QA Passed',              allowedRoles: ['qa', 'admin'], autoAssignRole: 'developer' },
        { from: 'ui-review',    to: 'design',       label: 'Design QA Failed',              allowedRoles: ['qa', 'admin'], requiresNote: true },
        { from: 'development',  to: 'code-review',  label: 'Submit for Code Review',        allowedRoles: ['developer'], requiresReferenceLink: true, githubTrigger: 'pr_merged' },
        { from: 'code-review',  to: 'qa-testing',   label: 'Code Review Passed',            allowedRoles: ['tech-lead', 'admin'], autoAssignRole: 'qa' },
        { from: 'code-review',  to: 'development',  label: 'Code Review Failed',            allowedRoles: ['tech-lead', 'admin'], requiresNote: true },
        { from: 'qa-testing',   to: 'deployment',   label: 'QA Passed',                     allowedRoles: ['qa', 'admin'], autoAssignRole: 'devops' },
        { from: 'qa-testing',   to: 'development',  label: 'QA Failed — Return to Developer', allowedRoles: ['qa'], requiresNote: true },
        { from: 'deployment',   to: 'done',         label: 'Deployed Successfully',         allowedRoles: ['devops', 'admin'], requiresNote: true, githubTrigger: 'workflow_completed' },
      ],
      escalationRules: [
        { stage: 'ui-review',   maxHoursInStage: 48, action: 'notify',   notifyRoles: ['project-lead', 'admin'] },
        { stage: 'qa-testing',  maxHoursInStage: 72, action: 'escalate', escalateToRole: 'admin' },
      ],
    },
  },

  {
    name:        'Simple',
    description: 'Minimal 3-stage workflow: Todo → In Progress → Done',
    isBuiltIn:   true,
    definition:  {
      initialStage:   'todo',
      terminalStages: ['done'],
      stages: [
        { id: 'todo',        label: 'Todo',        color: '#94a3b8' },
        { id: 'in-progress', label: 'In Progress', color: '#60a5fa' },
        { id: 'done',        label: 'Done',        color: '#4ade80' },
      ],
      transitions: [
        { from: 'todo',        to: 'in-progress', label: 'Start',    allowedRoles: ['admin', 'member', 'project-lead'] },
        { from: 'in-progress', to: 'done',        label: 'Complete', allowedRoles: ['admin', 'member', 'project-lead'], requiresNote: false },
        { from: 'in-progress', to: 'todo',        label: 'Put On Hold', allowedRoles: ['admin', 'member', 'project-lead'] },
      ],
      escalationRules: [],
    },
  },

  {
    name:        'QA Only',
    description: 'Testing pipeline: Assigned → Testing → Pass/Fail → Done',
    isBuiltIn:   true,
    definition:  {
      initialStage:   'assigned',
      terminalStages: ['done', 'failed'],
      stages: [
        { id: 'assigned', label: 'Assigned', color: '#94a3b8' },
        { id: 'testing',  label: 'Testing',  color: '#fb923c' },
        { id: 'done',     label: 'Done',     color: '#4ade80' },
        { id: 'failed',   label: 'Failed',   color: '#f87171' },
      ],
      transitions: [
        { from: 'assigned', to: 'testing', label: 'Start Testing', allowedRoles: ['qa', 'admin'] },
        { from: 'testing',  to: 'done',    label: 'Pass',          allowedRoles: ['qa', 'admin'], requiresNote: true },
        { from: 'testing',  to: 'failed',  label: 'Fail',          allowedRoles: ['qa', 'admin'], requiresNote: true, requiresAttachment: true },
      ],
      escalationRules: [
        { stage: 'testing', maxHoursInStage: 24, action: 'notify', notifyRoles: ['admin'] },
      ],
    },
  },

  {
    name:        'HR Talent Acquisition',
    description: 'Hiring pipeline: Sourced → Screening → Interview → Offer → Onboarding → Done',
    isBuiltIn:   true,
    definition:  {
      initialStage:   'sourced',
      terminalStages: ['onboarded', 'rejected'],
      stages: [
        { id: 'sourced',     label: 'Sourced',         color: '#94a3b8' },
        { id: 'screened',    label: 'Resume Screened', color: '#60a5fa' },
        { id: 'hr-interview',label: 'HR Interview',    color: '#818cf8' },
        { id: 'tech-round',  label: 'Technical Round', color: '#f472b6' },
        { id: 'offer',       label: 'Offer',           color: '#fbbf24' },
        { id: 'onboarding',  label: 'Onboarding',      color: '#2dd4bf' },
        { id: 'onboarded',   label: 'Done',            color: '#4ade80' },
        { id: 'rejected',    label: 'Rejected',        color: '#f87171' },
      ],
      transitions: [
        { from: 'sourced',      to: 'screened',     label: 'Screen Resume',     allowedRoles: ['admin', 'hr'] },
        { from: 'screened',     to: 'hr-interview', label: 'Schedule HR Round', allowedRoles: ['admin', 'hr'], requiresNote: true },
        { from: 'screened',     to: 'rejected',     label: 'Reject',            allowedRoles: ['admin', 'hr'], requiresNote: true },
        { from: 'hr-interview', to: 'tech-round',   label: 'HR Cleared',        allowedRoles: ['admin', 'hr'], requiresNote: true },
        { from: 'hr-interview', to: 'rejected',     label: 'Reject',            allowedRoles: ['admin', 'hr'], requiresNote: true },
        { from: 'tech-round',   to: 'offer',        label: 'Tech Round Passed', allowedRoles: ['admin', 'tech-lead'], requiresNote: true },
        { from: 'tech-round',   to: 'rejected',     label: 'Reject',            allowedRoles: ['admin', 'tech-lead'], requiresNote: true },
        { from: 'offer',        to: 'onboarding',   label: 'Offer Accepted',    allowedRoles: ['admin', 'hr'] },
        { from: 'offer',        to: 'rejected',     label: 'Offer Declined',    allowedRoles: ['admin', 'hr'], requiresNote: true },
        { from: 'onboarding',   to: 'onboarded',    label: 'Onboarding Complete', allowedRoles: ['admin', 'hr'], requiresNote: true },
      ],
      escalationRules: [
        { stage: 'offer', maxHoursInStage: 72, action: 'notify', notifyRoles: ['admin', 'hr'] },
      ],
    },
  },
];

// Call this from server.js after the DB connection is established.
// Seeds only for the given workspaceId if no built-in definitions exist yet.
const SeedBuiltInTemplates = async (workspaceId, createdBy) => {
  const existing = await prisma.workflowDefinition.count({
    where: { workspaceId, isBuiltIn: true },
  });

  if (existing > 0) {
    console.log(`[workflow-seed] Built-in templates already exist for workspace ${workspaceId}. Skipping.`);
    return;
  }

  for (const template of TEMPLATES) {
    await prisma.workflowDefinition.create({
      data: {
        workspaceId,
        name:        template.name,
        description: template.description,
        isBuiltIn:   template.isBuiltIn,
        definition:  template.definition,
        createdBy,
      },
    });
  }

  console.log(`[workflow-seed] Seeded ${TEMPLATES.length} built-in workflow templates for workspace ${workspaceId}.`);
};

module.exports = { SeedBuiltInTemplates, TEMPLATES };
