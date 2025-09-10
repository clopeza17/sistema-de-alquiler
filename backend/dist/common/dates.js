import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
export const GUATEMALA_TIMEZONE = 'America/Guatemala';
export function now() {
    return dayjs().tz(GUATEMALA_TIMEZONE);
}
export function fromString(dateString, format) {
    if (format) {
        return dayjs.tz(dateString, format, GUATEMALA_TIMEZONE);
    }
    return dayjs.tz(dateString, GUATEMALA_TIMEZONE);
}
export function formatForUI(date) {
    return dayjs(date).tz(GUATEMALA_TIMEZONE).format('DD/MM/YYYY');
}
export function formatDateTimeForUI(date) {
    return dayjs(date).tz(GUATEMALA_TIMEZONE).format('DD/MM/YYYY HH:mm');
}
export function formatForDB(date) {
    return dayjs(date).tz(GUATEMALA_TIMEZONE).format('YYYY-MM-DD');
}
export function formatDateTimeForDB(date) {
    return dayjs(date).tz(GUATEMALA_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}
export function isValidUIDate(dateString) {
    const parsed = dayjs(dateString, 'DD/MM/YYYY', true);
    return parsed.isValid();
}
export function convertUIDateToDB(uiDate) {
    const parsed = dayjs(uiDate, 'DD/MM/YYYY', true);
    if (!parsed.isValid()) {
        throw new Error(`Fecha inválida: ${uiDate}. Formato esperado: DD/MM/YYYY`);
    }
    return parsed.format('YYYY-MM-DD');
}
export function convertDBDateToUI(dbDate) {
    const parsed = dayjs(dbDate, 'YYYY-MM-DD', true);
    if (!parsed.isValid()) {
        throw new Error(`Fecha de DB inválida: ${dbDate}. Formato esperado: YYYY-MM-DD`);
    }
    return parsed.format('DD/MM/YYYY');
}
export function startOfMonth(date) {
    return dayjs(date).tz(GUATEMALA_TIMEZONE).startOf('month');
}
export function endOfMonth(date) {
    return dayjs(date).tz(GUATEMALA_TIMEZONE).endOf('month');
}
export function getCurrentMonthRange() {
    const now = dayjs().tz(GUATEMALA_TIMEZONE);
    return {
        start: now.startOf('month').format('YYYY-MM-DD'),
        end: now.endOf('month').format('YYYY-MM-DD'),
    };
}
export function daysDifference(date1, date2) {
    const d1 = dayjs(date1).tz(GUATEMALA_TIMEZONE);
    const d2 = dayjs(date2).tz(GUATEMALA_TIMEZONE);
    return d1.diff(d2, 'day');
}
export function isOverdue(date) {
    const today = dayjs().tz(GUATEMALA_TIMEZONE).startOf('day');
    const checkDate = dayjs(date).tz(GUATEMALA_TIMEZONE).startOf('day');
    return checkDate.isBefore(today);
}
export default {
    now,
    fromString,
    formatForUI,
    formatDateTimeForUI,
    formatForDB,
    formatDateTimeForDB,
    isValidUIDate,
    convertUIDateToDB,
    convertDBDateToUI,
    startOfMonth,
    endOfMonth,
    getCurrentMonthRange,
    daysDifference,
    isOverdue,
};
//# sourceMappingURL=dates.js.map