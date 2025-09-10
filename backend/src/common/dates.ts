import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

// Extender dayjs con plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Zona horaria de Guatemala
export const GUATEMALA_TIMEZONE = 'America/Guatemala';

/**
 * Obtener fecha actual en zona horaria de Guatemala
 */
export function now(): dayjs.Dayjs {
  return dayjs().tz(GUATEMALA_TIMEZONE);
}

/**
 * Crear fecha desde string en zona de Guatemala
 */
export function fromString(dateString: string, format?: string): dayjs.Dayjs {
  if (format) {
    return dayjs.tz(dateString, format, GUATEMALA_TIMEZONE);
  }
  return dayjs.tz(dateString, GUATEMALA_TIMEZONE);
}

/**
 * Formatear fecha para mostrar en UI (dd/mm/aaaa)
 */
export function formatForUI(date: dayjs.Dayjs | string | Date): string {
  return dayjs(date).tz(GUATEMALA_TIMEZONE).format('DD/MM/YYYY');
}

/**
 * Formatear fecha y hora para UI (dd/mm/aaaa HH:mm)
 */
export function formatDateTimeForUI(date: dayjs.Dayjs | string | Date): string {
  return dayjs(date).tz(GUATEMALA_TIMEZONE).format('DD/MM/YYYY HH:mm');
}

/**
 * Formatear fecha para base de datos (YYYY-MM-DD)
 */
export function formatForDB(date: dayjs.Dayjs | string | Date): string {
  return dayjs(date).tz(GUATEMALA_TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Formatear fecha y hora para base de datos (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTimeForDB(date: dayjs.Dayjs | string | Date): string {
  return dayjs(date).tz(GUATEMALA_TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * Validar si una fecha está en formato dd/mm/aaaa
 */
export function isValidUIDate(dateString: string): boolean {
  const parsed = dayjs(dateString, 'DD/MM/YYYY', true);
  return parsed.isValid();
}

/**
 * Convertir fecha de UI (dd/mm/aaaa) a formato DB (YYYY-MM-DD)
 */
export function convertUIDateToDB(uiDate: string): string {
  const parsed = dayjs(uiDate, 'DD/MM/YYYY', true);
  if (!parsed.isValid()) {
    throw new Error(`Fecha inválida: ${uiDate}. Formato esperado: DD/MM/YYYY`);
  }
  return parsed.format('YYYY-MM-DD');
}

/**
 * Convertir fecha de DB (YYYY-MM-DD) a formato UI (dd/mm/aaaa)
 */
export function convertDBDateToUI(dbDate: string): string {
  const parsed = dayjs(dbDate, 'YYYY-MM-DD', true);
  if (!parsed.isValid()) {
    throw new Error(`Fecha de DB inválida: ${dbDate}. Formato esperado: YYYY-MM-DD`);
  }
  return parsed.format('DD/MM/YYYY');
}

/**
 * Obtener primer día del mes
 */
export function startOfMonth(date?: dayjs.Dayjs | string | Date): dayjs.Dayjs {
  return dayjs(date).tz(GUATEMALA_TIMEZONE).startOf('month');
}

/**
 * Obtener último día del mes
 */
export function endOfMonth(date?: dayjs.Dayjs | string | Date): dayjs.Dayjs {
  return dayjs(date).tz(GUATEMALA_TIMEZONE).endOf('month');
}

/**
 * Obtener rango de fechas del mes actual
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = dayjs().tz(GUATEMALA_TIMEZONE);
  return {
    start: now.startOf('month').format('YYYY-MM-DD'),
    end: now.endOf('month').format('YYYY-MM-DD'),
  };
}

/**
 * Calcular diferencia en días entre dos fechas
 */
export function daysDifference(date1: dayjs.Dayjs | string | Date, date2: dayjs.Dayjs | string | Date): number {
  const d1 = dayjs(date1).tz(GUATEMALA_TIMEZONE);
  const d2 = dayjs(date2).tz(GUATEMALA_TIMEZONE);
  return d1.diff(d2, 'day');
}

/**
 * Verificar si una fecha es vencida (anterior a hoy)
 */
export function isOverdue(date: dayjs.Dayjs | string | Date): boolean {
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
