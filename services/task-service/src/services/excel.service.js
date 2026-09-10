const XLSX = require('xlsx');
const { APIError } = require('@pms/error-handler');
const { PRIORITY_LEVELS } = require('@pms/constants');
const TaskService = require('./task.service');

const VALID_PRIORITIES = new Set(Object.values(PRIORITY_LEVELS));
const MAX_ROWS = 1000;

const _splitIds = (value) => {
    if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
    if (value === undefined || value === null) return [];
    return String(value)
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
};

const _normalizeDate = (value) => {
    if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
    return null;
};

// Parse the workbook into normalized, validated rows (no DB writes).
const ParsePreview = (buffer) => {
    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch (_err) {
        throw new APIError(400, 'Unable to read the uploaded spreadsheet. Provide a valid .xlsx/.csv file.');
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new APIError(400, 'The spreadsheet has no sheets.');

    const raw = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    if (raw.length === 0) throw new APIError(400, 'The spreadsheet has no data rows.');
    if (raw.length > MAX_ROWS) throw new APIError(400, `Too many rows (${raw.length}). Maximum is ${MAX_ROWS} per import.`);

    let validCount = 0;
    const rows = raw.map((entry, idx) => {
        // Header keys are matched case-insensitively.
        const lower = {};
        Object.keys(entry).forEach((k) => { lower[k.trim().toLowerCase()] = entry[k]; });

        const title = String(lower.title ?? '').trim();
        const description = String(lower.description ?? '').trim() || undefined;
        const priority = String(lower.priority ?? '').trim().toLowerCase();
        const dueDate = _normalizeDate(lower.duedate ?? lower['due date']);
        const assignees = _splitIds(lower.assignees ?? lower.assignee);
        const sprintId = String(lower.sprintid ?? lower['sprint id'] ?? '').trim() || undefined;

        const errors = [];
        if (!title) errors.push('title is required');
        if (!priority || !VALID_PRIORITIES.has(priority)) errors.push(`priority must be one of: ${[...VALID_PRIORITIES].join(', ')}`);
        if (!dueDate) errors.push('dueDate is missing or invalid');
        if (assignees.length === 0) errors.push('at least one assignee is required');

        const valid = errors.length === 0;
        if (valid) validCount += 1;

        return {
            rowNumber: idx + 2, // +1 for header, +1 for 1-based
            valid,
            errors,
            data: { title, description, priority, dueDate, assignees, sprintId },
        };
    });

    return {
        summary: { total: rows.length, valid: validCount, invalid: rows.length - validCount },
        rows,
    };
};

// Create one task per valid row. Invalid rows are skipped and reported.
const BulkImport = async (userId, { projectId, workspaceId, projectHeadId, rows }) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new APIError(400, 'No rows provided for import.');
    }
    if (rows.length > MAX_ROWS) {
        throw new APIError(400, `Too many rows (${rows.length}). Maximum is ${MAX_ROWS} per import.`);
    }

    const results = [];
    let created = 0;

    for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        try {
            const task = await TaskService.CreateTask(userId, {
                title: row.title,
                description: row.description,
                priority: row.priority,
                dueDate: row.dueDate,
                assignees: row.assignees,
                projectId,
                workspaceId,
                projectHeadId,
                sprintId: row.sprintId,
            });
            created += 1;
            results.push({ index: i, success: true, taskId: task.id });
        } catch (err) {
            results.push({ index: i, success: false, error: err.message || 'Failed to create task' });
        }
    }

    return {
        summary: { total: rows.length, created, failed: rows.length - created },
        results,
    };
};

module.exports = { ParsePreview, BulkImport };
