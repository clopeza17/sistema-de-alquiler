import dayjs from 'dayjs';
export declare const GUATEMALA_TIMEZONE = "America/Guatemala";
export declare function now(): dayjs.Dayjs;
export declare function fromString(dateString: string, format?: string): dayjs.Dayjs;
export declare function formatForUI(date: dayjs.Dayjs | string | Date): string;
export declare function formatDateTimeForUI(date: dayjs.Dayjs | string | Date): string;
export declare function formatForDB(date: dayjs.Dayjs | string | Date): string;
export declare function formatDateTimeForDB(date: dayjs.Dayjs | string | Date): string;
export declare function isValidUIDate(dateString: string): boolean;
export declare function convertUIDateToDB(uiDate: string): string;
export declare function convertDBDateToUI(dbDate: string): string;
export declare function startOfMonth(date?: dayjs.Dayjs | string | Date): dayjs.Dayjs;
export declare function endOfMonth(date?: dayjs.Dayjs | string | Date): dayjs.Dayjs;
export declare function getCurrentMonthRange(): {
    start: string;
    end: string;
};
export declare function daysDifference(date1: dayjs.Dayjs | string | Date, date2: dayjs.Dayjs | string | Date): number;
export declare function isOverdue(date: dayjs.Dayjs | string | Date): boolean;
declare const _default: {
    now: typeof now;
    fromString: typeof fromString;
    formatForUI: typeof formatForUI;
    formatDateTimeForUI: typeof formatDateTimeForUI;
    formatForDB: typeof formatForDB;
    formatDateTimeForDB: typeof formatDateTimeForDB;
    isValidUIDate: typeof isValidUIDate;
    convertUIDateToDB: typeof convertUIDateToDB;
    convertDBDateToUI: typeof convertDBDateToUI;
    startOfMonth: typeof startOfMonth;
    endOfMonth: typeof endOfMonth;
    getCurrentMonthRange: typeof getCurrentMonthRange;
    daysDifference: typeof daysDifference;
    isOverdue: typeof isOverdue;
};
export default _default;
//# sourceMappingURL=dates.d.ts.map