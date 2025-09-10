import { z } from 'zod';
export declare const idSchema: z.ZodNumber;
export declare const emailSchema: z.ZodString;
export declare const passwordSchema: z.ZodString;
export declare const nameSchema: z.ZodString;
export declare const phoneSchema: z.ZodOptional<z.ZodString>;
export declare const dpiSchema: z.ZodOptional<z.ZodString>;
export declare const nitSchema: z.ZodOptional<z.ZodString>;
export declare const uiDateSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const dbDateSchema: z.ZodString;
export declare const amountSchema: z.ZodNumber;
export declare const codeSchema: z.ZodString;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const sortSchema: z.ZodOptional<z.ZodString>;
export declare const dateRangeSchema: z.ZodEffects<z.ZodObject<{
    desde: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    hasta: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
}, "strip", z.ZodTypeAny, {
    desde?: string | undefined;
    hasta?: string | undefined;
}, {
    desde?: string | undefined;
    hasta?: string | undefined;
}>, {
    desde?: string | undefined;
    hasta?: string | undefined;
}, {
    desde?: string | undefined;
    hasta?: string | undefined;
}>;
export declare function validateContractDates(fechaInicio: string, fechaFin: string): boolean;
export declare function validateFutureDate(date: string): boolean;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    nombres: z.ZodString;
    apellidos: z.ZodString;
    telefono: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    nombres: string;
    apellidos: string;
    telefono?: string | undefined;
}, {
    email: string;
    password: string;
    nombres: string;
    apellidos: string;
    telefono?: string | undefined;
}>;
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const userCreateSchema: z.ZodObject<{
    correo: z.ZodString;
    contrasena: z.ZodString;
    nombre_completo: z.ZodString;
    roles: z.ZodArray<z.ZodNumber, "many">;
}, "strip", z.ZodTypeAny, {
    roles: number[];
    correo: string;
    contrasena: string;
    nombre_completo: string;
}, {
    roles: number[];
    correo: string;
    contrasena: string;
    nombre_completo: string;
}>;
export declare const userUpdateSchema: z.ZodObject<Omit<{
    correo: z.ZodOptional<z.ZodString>;
    contrasena: z.ZodOptional<z.ZodString>;
    nombre_completo: z.ZodOptional<z.ZodString>;
    roles: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
}, "contrasena">, "strip", z.ZodTypeAny, {
    roles?: number[] | undefined;
    correo?: string | undefined;
    nombre_completo?: string | undefined;
}, {
    roles?: number[] | undefined;
    correo?: string | undefined;
    nombre_completo?: string | undefined;
}>;
export declare const inquilinoCreateSchema: z.ZodObject<{
    doc_identidad: z.ZodOptional<z.ZodString>;
    nombre_completo: z.ZodString;
    telefono: z.ZodOptional<z.ZodString>;
    correo: z.ZodOptional<z.ZodString>;
    direccion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nombre_completo: string;
    telefono?: string | undefined;
    correo?: string | undefined;
    doc_identidad?: string | undefined;
    direccion?: string | undefined;
}, {
    nombre_completo: string;
    telefono?: string | undefined;
    correo?: string | undefined;
    doc_identidad?: string | undefined;
    direccion?: string | undefined;
}>;
export declare const inquilinoUpdateSchema: z.ZodObject<{
    doc_identidad: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    nombre_completo: z.ZodOptional<z.ZodString>;
    telefono: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    correo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    direccion: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    telefono?: string | undefined;
    correo?: string | undefined;
    nombre_completo?: string | undefined;
    doc_identidad?: string | undefined;
    direccion?: string | undefined;
}, {
    telefono?: string | undefined;
    correo?: string | undefined;
    nombre_completo?: string | undefined;
    doc_identidad?: string | undefined;
    direccion?: string | undefined;
}>;
export declare const propiedadCreateSchema: z.ZodObject<{
    codigo: z.ZodString;
    tipo: z.ZodEnum<["APARTAMENTO", "CASA", "ESTUDIO", "OTRO"]>;
    titulo: z.ZodString;
    direccion: z.ZodString;
    dormitorios: z.ZodNumber;
    banos: z.ZodNumber;
    area_m2: z.ZodOptional<z.ZodNumber>;
    renta_mensual: z.ZodNumber;
    deposito: z.ZodDefault<z.ZodNumber>;
    notas: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    direccion: string;
    codigo: string;
    tipo: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO";
    titulo: string;
    dormitorios: number;
    banos: number;
    renta_mensual: number;
    deposito: number;
    area_m2?: number | undefined;
    notas?: string | undefined;
}, {
    direccion: string;
    codigo: string;
    tipo: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO";
    titulo: string;
    dormitorios: number;
    banos: number;
    renta_mensual: number;
    area_m2?: number | undefined;
    deposito?: number | undefined;
    notas?: string | undefined;
}>;
export declare const propiedadUpdateSchema: z.ZodObject<{
    codigo: z.ZodOptional<z.ZodString>;
    tipo: z.ZodOptional<z.ZodEnum<["APARTAMENTO", "CASA", "ESTUDIO", "OTRO"]>>;
    titulo: z.ZodOptional<z.ZodString>;
    direccion: z.ZodOptional<z.ZodString>;
    dormitorios: z.ZodOptional<z.ZodNumber>;
    banos: z.ZodOptional<z.ZodNumber>;
    area_m2: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    renta_mensual: z.ZodOptional<z.ZodNumber>;
    deposito: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    notas: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    direccion?: string | undefined;
    codigo?: string | undefined;
    tipo?: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO" | undefined;
    titulo?: string | undefined;
    dormitorios?: number | undefined;
    banos?: number | undefined;
    area_m2?: number | undefined;
    renta_mensual?: number | undefined;
    deposito?: number | undefined;
    notas?: string | undefined;
}, {
    direccion?: string | undefined;
    codigo?: string | undefined;
    tipo?: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO" | undefined;
    titulo?: string | undefined;
    dormitorios?: number | undefined;
    banos?: number | undefined;
    area_m2?: number | undefined;
    renta_mensual?: number | undefined;
    deposito?: number | undefined;
    notas?: string | undefined;
}>;
export declare const contratoCreateSchema: z.ZodEffects<z.ZodObject<{
    propiedad_id: z.ZodNumber;
    inquilino_id: z.ZodNumber;
    fecha_inicio: z.ZodEffects<z.ZodString, string, string>;
    fecha_fin: z.ZodEffects<z.ZodString, string, string>;
    renta_mensual: z.ZodNumber;
    deposito: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    renta_mensual: number;
    deposito: number;
    propiedad_id: number;
    inquilino_id: number;
    fecha_inicio: string;
    fecha_fin: string;
}, {
    renta_mensual: number;
    propiedad_id: number;
    inquilino_id: number;
    fecha_inicio: string;
    fecha_fin: string;
    deposito?: number | undefined;
}>, {
    renta_mensual: number;
    deposito: number;
    propiedad_id: number;
    inquilino_id: number;
    fecha_inicio: string;
    fecha_fin: string;
}, {
    renta_mensual: number;
    propiedad_id: number;
    inquilino_id: number;
    fecha_inicio: string;
    fecha_fin: string;
    deposito?: number | undefined;
}>;
export declare const pagoCreateSchema: z.ZodObject<{
    contrato_id: z.ZodNumber;
    forma_pago_id: z.ZodNumber;
    fecha_pago: z.ZodEffects<z.ZodString, string, string>;
    referencia: z.ZodOptional<z.ZodString>;
    monto: z.ZodNumber;
    notas: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    contrato_id: number;
    forma_pago_id: number;
    fecha_pago: string;
    monto: number;
    notas?: string | undefined;
    referencia?: string | undefined;
}, {
    contrato_id: number;
    forma_pago_id: number;
    fecha_pago: string;
    monto: number;
    notas?: string | undefined;
    referencia?: string | undefined;
}>;
export declare const aplicacionPagoSchema: z.ZodObject<{
    factura_id: z.ZodNumber;
    monto_aplicado: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    factura_id: number;
    monto_aplicado: number;
}, {
    factura_id: number;
    monto_aplicado: number;
}>;
export declare function formatZodErrors(error: z.ZodError): string[];
declare const _default: {
    idSchema: z.ZodNumber;
    emailSchema: z.ZodString;
    passwordSchema: z.ZodString;
    nameSchema: z.ZodString;
    phoneSchema: z.ZodOptional<z.ZodString>;
    dpiSchema: z.ZodOptional<z.ZodString>;
    nitSchema: z.ZodOptional<z.ZodString>;
    uiDateSchema: z.ZodEffects<z.ZodString, string, string>;
    dbDateSchema: z.ZodString;
    amountSchema: z.ZodNumber;
    codeSchema: z.ZodString;
    paginationSchema: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
    }, {
        page?: number | undefined;
        limit?: number | undefined;
    }>;
    sortSchema: z.ZodOptional<z.ZodString>;
    dateRangeSchema: z.ZodEffects<z.ZodObject<{
        desde: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
        hasta: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    }, "strip", z.ZodTypeAny, {
        desde?: string | undefined;
        hasta?: string | undefined;
    }, {
        desde?: string | undefined;
        hasta?: string | undefined;
    }>, {
        desde?: string | undefined;
        hasta?: string | undefined;
    }, {
        desde?: string | undefined;
        hasta?: string | undefined;
    }>;
    userCreateSchema: z.ZodObject<{
        correo: z.ZodString;
        contrasena: z.ZodString;
        nombre_completo: z.ZodString;
        roles: z.ZodArray<z.ZodNumber, "many">;
    }, "strip", z.ZodTypeAny, {
        roles: number[];
        correo: string;
        contrasena: string;
        nombre_completo: string;
    }, {
        roles: number[];
        correo: string;
        contrasena: string;
        nombre_completo: string;
    }>;
    userUpdateSchema: z.ZodObject<Omit<{
        correo: z.ZodOptional<z.ZodString>;
        contrasena: z.ZodOptional<z.ZodString>;
        nombre_completo: z.ZodOptional<z.ZodString>;
        roles: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "contrasena">, "strip", z.ZodTypeAny, {
        roles?: number[] | undefined;
        correo?: string | undefined;
        nombre_completo?: string | undefined;
    }, {
        roles?: number[] | undefined;
        correo?: string | undefined;
        nombre_completo?: string | undefined;
    }>;
    inquilinoCreateSchema: z.ZodObject<{
        doc_identidad: z.ZodOptional<z.ZodString>;
        nombre_completo: z.ZodString;
        telefono: z.ZodOptional<z.ZodString>;
        correo: z.ZodOptional<z.ZodString>;
        direccion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        nombre_completo: string;
        telefono?: string | undefined;
        correo?: string | undefined;
        doc_identidad?: string | undefined;
        direccion?: string | undefined;
    }, {
        nombre_completo: string;
        telefono?: string | undefined;
        correo?: string | undefined;
        doc_identidad?: string | undefined;
        direccion?: string | undefined;
    }>;
    inquilinoUpdateSchema: z.ZodObject<{
        doc_identidad: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        nombre_completo: z.ZodOptional<z.ZodString>;
        telefono: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        correo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        direccion: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        telefono?: string | undefined;
        correo?: string | undefined;
        nombre_completo?: string | undefined;
        doc_identidad?: string | undefined;
        direccion?: string | undefined;
    }, {
        telefono?: string | undefined;
        correo?: string | undefined;
        nombre_completo?: string | undefined;
        doc_identidad?: string | undefined;
        direccion?: string | undefined;
    }>;
    propiedadCreateSchema: z.ZodObject<{
        codigo: z.ZodString;
        tipo: z.ZodEnum<["APARTAMENTO", "CASA", "ESTUDIO", "OTRO"]>;
        titulo: z.ZodString;
        direccion: z.ZodString;
        dormitorios: z.ZodNumber;
        banos: z.ZodNumber;
        area_m2: z.ZodOptional<z.ZodNumber>;
        renta_mensual: z.ZodNumber;
        deposito: z.ZodDefault<z.ZodNumber>;
        notas: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        direccion: string;
        codigo: string;
        tipo: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO";
        titulo: string;
        dormitorios: number;
        banos: number;
        renta_mensual: number;
        deposito: number;
        area_m2?: number | undefined;
        notas?: string | undefined;
    }, {
        direccion: string;
        codigo: string;
        tipo: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO";
        titulo: string;
        dormitorios: number;
        banos: number;
        renta_mensual: number;
        area_m2?: number | undefined;
        deposito?: number | undefined;
        notas?: string | undefined;
    }>;
    propiedadUpdateSchema: z.ZodObject<{
        codigo: z.ZodOptional<z.ZodString>;
        tipo: z.ZodOptional<z.ZodEnum<["APARTAMENTO", "CASA", "ESTUDIO", "OTRO"]>>;
        titulo: z.ZodOptional<z.ZodString>;
        direccion: z.ZodOptional<z.ZodString>;
        dormitorios: z.ZodOptional<z.ZodNumber>;
        banos: z.ZodOptional<z.ZodNumber>;
        area_m2: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        renta_mensual: z.ZodOptional<z.ZodNumber>;
        deposito: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        notas: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        direccion?: string | undefined;
        codigo?: string | undefined;
        tipo?: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO" | undefined;
        titulo?: string | undefined;
        dormitorios?: number | undefined;
        banos?: number | undefined;
        area_m2?: number | undefined;
        renta_mensual?: number | undefined;
        deposito?: number | undefined;
        notas?: string | undefined;
    }, {
        direccion?: string | undefined;
        codigo?: string | undefined;
        tipo?: "APARTAMENTO" | "CASA" | "ESTUDIO" | "OTRO" | undefined;
        titulo?: string | undefined;
        dormitorios?: number | undefined;
        banos?: number | undefined;
        area_m2?: number | undefined;
        renta_mensual?: number | undefined;
        deposito?: number | undefined;
        notas?: string | undefined;
    }>;
    contratoCreateSchema: z.ZodEffects<z.ZodObject<{
        propiedad_id: z.ZodNumber;
        inquilino_id: z.ZodNumber;
        fecha_inicio: z.ZodEffects<z.ZodString, string, string>;
        fecha_fin: z.ZodEffects<z.ZodString, string, string>;
        renta_mensual: z.ZodNumber;
        deposito: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        renta_mensual: number;
        deposito: number;
        propiedad_id: number;
        inquilino_id: number;
        fecha_inicio: string;
        fecha_fin: string;
    }, {
        renta_mensual: number;
        propiedad_id: number;
        inquilino_id: number;
        fecha_inicio: string;
        fecha_fin: string;
        deposito?: number | undefined;
    }>, {
        renta_mensual: number;
        deposito: number;
        propiedad_id: number;
        inquilino_id: number;
        fecha_inicio: string;
        fecha_fin: string;
    }, {
        renta_mensual: number;
        propiedad_id: number;
        inquilino_id: number;
        fecha_inicio: string;
        fecha_fin: string;
        deposito?: number | undefined;
    }>;
    pagoCreateSchema: z.ZodObject<{
        contrato_id: z.ZodNumber;
        forma_pago_id: z.ZodNumber;
        fecha_pago: z.ZodEffects<z.ZodString, string, string>;
        referencia: z.ZodOptional<z.ZodString>;
        monto: z.ZodNumber;
        notas: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        contrato_id: number;
        forma_pago_id: number;
        fecha_pago: string;
        monto: number;
        notas?: string | undefined;
        referencia?: string | undefined;
    }, {
        contrato_id: number;
        forma_pago_id: number;
        fecha_pago: string;
        monto: number;
        notas?: string | undefined;
        referencia?: string | undefined;
    }>;
    aplicacionPagoSchema: z.ZodObject<{
        factura_id: z.ZodNumber;
        monto_aplicado: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        factura_id: number;
        monto_aplicado: number;
    }, {
        factura_id: number;
        monto_aplicado: number;
    }>;
    loginSchema: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
    }, {
        email: string;
        password: string;
    }>;
    registerSchema: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
        nombres: z.ZodString;
        apellidos: z.ZodString;
        telefono: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        email: string;
        password: string;
        nombres: string;
        apellidos: string;
        telefono?: string | undefined;
    }, {
        email: string;
        password: string;
        nombres: string;
        apellidos: string;
        telefono?: string | undefined;
    }>;
    refreshTokenSchema: z.ZodObject<{
        refreshToken: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        refreshToken: string;
    }, {
        refreshToken: string;
    }>;
    validateContractDates: typeof validateContractDates;
    validateFutureDate: typeof validateFutureDate;
    formatZodErrors: typeof formatZodErrors;
};
export default _default;
//# sourceMappingURL=validators.d.ts.map