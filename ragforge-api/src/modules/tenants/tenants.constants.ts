export const TENANT_DEFAULT_ACTIVE = true;
export const TENANT_NAME_MAX_LENGTH = 255;
export const TENANT_SLUG_MAX_LENGTH = 100;

export const TENANT_ERRORS = {
    SLUG_EXISTS: "Tenant slug already exists",
    NOT_FOUND: "Tenant not found",
    INACTIVE: "Tenant is inactive",
} as const;

export enum TenantRole {
    OWNER = "OWNER",
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
}