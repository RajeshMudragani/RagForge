import { users } from "../../database/schema/users.schema.js";

export const publicUserSelect = {
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
    tenantId: users.tenantId,
    isActive: users.isActive,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
};