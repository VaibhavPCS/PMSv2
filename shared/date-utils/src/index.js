const StartOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

const EndOfDay = (date) => {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
}

const DayBetween = (date1, date2) => {
    const startOfDay1 = StartOfDay(date1);
    const startOfDay2 = StartOfDay(date2);
    const timeDiff = Math.abs(startOfDay1 - startOfDay2);
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

const ToUTCMindnight = (date) => {
    const newDate = new Date(date);
    newDate.setUTCHours(0, 0, 0, 0);
    return newDate;
}

const GetWeekStartDate = (date) => {
    const newDate = new Date(date);
    const dayOfWeek = newDate.getDay();
    const diff = newDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    newDate.setDate(diff);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

const GetWeekEndDate = (date) => {
    const newDate = new Date(date);
    const dayOfWeek = newDate.getDay();
    const diff = newDate.getDate() + (7 - dayOfWeek) % 7;
    newDate.setDate(diff);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
}

const FormatDDMMYYYY = (date) => {
    const newDate = new Date(date);
    const day = String(newDate.getDate()).padStart(2, '0');
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const year = newDate.getFullYear();
    return `${day}/${month}/${year}`;
}

const FormatYYYYMMDD = (date) => {
    const newDate = new Date(date);
    const day = String(newDate.getDate()).padStart(2, '0');
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const year = newDate.getFullYear();
    return `${year}-${month}-${day}`;
}

const ParseDate = (dateString) => {
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
}

const IsValidDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= end;
}

const AddDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
}

const SubtractDays = (date, days) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate;
}

module.exports = {
    StartOfDay,
    EndOfDay,
    DayBetween,
    ToUTCMindnight,
    GetWeekStartDate,
    GetWeekEndDate,
    FormatDDMMYYYY,
    FormatYYYYMMDD,
    ParseDate,
    IsValidDateRange,
    AddDays,
    SubtractDays
}
