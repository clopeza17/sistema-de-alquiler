import { z } from 'zod';
import { isValidUIDate, convertUIDateToDB } from './dates.js';
export const idSchema = z.coerce.number().int().positive('ID debe ser un número positivo');
export const emailSchema = z.string()
    .email('Correo electrónico inválido')
    .max(180, 'Correo muy largo (máximo 180 caracteres)');
export const passwordSchema = z.string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Contraseña debe tener al menos una mayúscula')
    .regex(/[a-z]/, 'Contraseña debe tener al menos una minúscula')
    .regex(/[0-9]/, 'Contraseña debe tener al menos un número');
export const nameSchema = z.string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(120, 'Nombre muy largo (máximo 120 caracteres)')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Nombre solo puede contener letras y espacios');
export const phoneSchema = z.string()
    .regex(/^[0-9]{8}$/, 'Teléfono debe tener exactamente 8 dígitos')
    .optional();
export const dpiSchema = z.string()
    .regex(/^[0-9]{13}$/, 'DPI debe tener exactamente 13 dígitos')
    .optional();
export const nitSchema = z.string()
    .regex(/^[0-9]+-?[0-9Kk]?$/, 'NIT inválido')
    .optional();
export const uiDateSchema = z.string()
    .refine(isValidUIDate, 'Fecha inválida. Formato esperado: DD/MM/AAAA');
export const dbDateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD');
export const amountSchema = z.coerce.number()
    .nonnegative('Monto debe ser positivo')
    .multipleOf(0.01, 'Monto puede tener máximo 2 decimales');
export const codeSchema = z.string()
    .min(2, 'Código debe tener al menos 2 caracteres')
    .max(32, 'Código muy largo (máximo 32 caracteres)')
    .regex(/^[A-Z0-9_-]+$/, 'Código solo puede contener letras mayúsculas, números, guiones y underscores');
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1, 'Página debe ser mayor a 0').default(1),
    limit: z.coerce.number().int().min(1, 'Límite debe ser mayor a 0').max(100, 'Límite máximo es 100').default(20),
});
export const sortSchema = z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*(-desc)?$/, 'Formato de ordenamiento inválido')
    .optional();
export const dateRangeSchema = z.object({
    desde: uiDateSchema.optional(),
    hasta: uiDateSchema.optional(),
}).refine((data) => {
    if (data.desde && data.hasta) {
        const desde = convertUIDateToDB(data.desde);
        const hasta = convertUIDateToDB(data.hasta);
        return desde <= hasta;
    }
    return true;
}, 'Fecha desde debe ser menor o igual a fecha hasta');
export function validateContractDates(fechaInicio, fechaFin) {
    try {
        const inicio = convertUIDateToDB(fechaInicio);
        const fin = convertUIDateToDB(fechaFin);
        return inicio <= fin;
    }
    catch {
        return false;
    }
}
export function validateFutureDate(date) {
    try {
        const fechaDB = convertUIDateToDB(date);
        const hoy = new Date().toISOString().split('T')[0];
        return fechaDB >= hoy;
    }
    catch {
        return false;
    }
}
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Contraseña requerida'),
});
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    nombres: nameSchema,
    apellidos: nameSchema,
    telefono: phoneSchema,
});
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token requerido'),
});
export const userCreateSchema = z.object({
    correo: emailSchema,
    contrasena: passwordSchema,
    nombre_completo: nameSchema,
    roles: z.array(idSchema).min(1, 'Usuario debe tener al menos un rol'),
});
export const userUpdateSchema = userCreateSchema.partial().omit({ contrasena: true });
export const inquilinoCreateSchema = z.object({
    doc_identidad: dpiSchema,
    nombre_completo: nameSchema,
    telefono: phoneSchema,
    correo: emailSchema.optional(),
    direccion: z.string().max(255, 'Dirección muy larga').optional(),
});
export const inquilinoUpdateSchema = inquilinoCreateSchema.partial();
export const propiedadCreateSchema = z.object({
    codigo: codeSchema,
    tipo: z.enum(['APARTAMENTO', 'CASA', 'ESTUDIO', 'OTRO']),
    titulo: z.string().min(5, 'Título muy corto').max(160, 'Título muy largo'),
    direccion: z.string().min(10, 'Dirección muy corta').max(255, 'Dirección muy larga'),
    dormitorios: z.coerce.number().int().min(0).max(20),
    banos: z.coerce.number().int().min(0).max(10),
    area_m2: z.coerce.number().positive().optional(),
    renta_mensual: amountSchema,
    deposito: amountSchema.default(0),
    notas: z.string().max(1000, 'Notas muy largas').optional(),
});
export const propiedadUpdateSchema = propiedadCreateSchema.partial();
export const contratoCreateSchema = z.object({
    propiedad_id: idSchema,
    inquilino_id: idSchema,
    fecha_inicio: uiDateSchema,
    fecha_fin: uiDateSchema,
    renta_mensual: amountSchema,
    deposito: amountSchema.default(0),
}).refine((data) => validateContractDates(data.fecha_inicio, data.fecha_fin), 'Fecha de inicio debe ser menor o igual a fecha de fin');
export const pagoCreateSchema = z.object({
    contrato_id: idSchema,
    forma_pago_id: idSchema,
    fecha_pago: uiDateSchema,
    referencia: z.string().max(80, 'Referencia muy larga').optional(),
    monto: amountSchema,
    notas: z.string().max(255, 'Notas muy largas').optional(),
});
export const aplicacionPagoSchema = z.object({
    factura_id: idSchema,
    monto_aplicado: amountSchema,
});
export function formatZodErrors(error) {
    return error.errors.map(err => {
        const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
    });
}
export default {
    idSchema,
    emailSchema,
    passwordSchema,
    nameSchema,
    phoneSchema,
    dpiSchema,
    nitSchema,
    uiDateSchema,
    dbDateSchema,
    amountSchema,
    codeSchema,
    paginationSchema,
    sortSchema,
    dateRangeSchema,
    userCreateSchema,
    userUpdateSchema,
    inquilinoCreateSchema,
    inquilinoUpdateSchema,
    propiedadCreateSchema,
    propiedadUpdateSchema,
    contratoCreateSchema,
    pagoCreateSchema,
    aplicacionPagoSchema,
    loginSchema,
    registerSchema,
    refreshTokenSchema,
    validateContractDates,
    validateFutureDate,
    formatZodErrors,
};
//# sourceMappingURL=validators.js.map