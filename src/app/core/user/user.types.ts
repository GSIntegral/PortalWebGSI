/**
 * Tipo de sesión del portal:
 *  - `staff`: equipo de GS Integral, entra con su login de la plataforma Facil ISO.
 *  - `client`: usuario del portal (cliente), ligado a UNA empresa, con login independiente.
 */
export type SessionKind = 'staff' | 'client';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    status?: string;
    role?: string;
    roles?: string[];
    companyId?: number | null;
    profileId?: string;
    profileName?: string;
    isActive?: boolean;
    isFirstLogin?: boolean;
    failedAttempts?: number;
    isLocked?: boolean;
    requiresPasswordChange?: boolean;
    isSuperAdmin?: boolean;
    companyName?: string;
    companyLogo?: string | null;
    permissions?: string[];
    /** Tipo de sesión; ausente solo en estados transitorios previos a la autenticación. */
    kind?: SessionKind;
    /** Solo clientes: empresa a la que está ligado el usuario del portal. */
    clientId?: string;
    clientCode?: string;
    clientName?: string;
}
