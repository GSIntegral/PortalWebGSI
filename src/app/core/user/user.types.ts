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
}
