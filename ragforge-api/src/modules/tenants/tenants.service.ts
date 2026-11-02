import { ConflictError } from "../../common/errors/index.js";
import { CreateTenantDto } from "./dto/create-tenant.dto.js";
import { UpdateTenantDto } from "./dto/update-tenant.dto.js";
import { TENANT_ERRORS } from "./tenants.constants.js";
import { TenantsRepository } from "./tenants.repository.js";

export class TenantsService {

    private readonly repository = new TenantsRepository();

    async create(
        dto: CreateTenantDto,
    ) {

        const existingTenant = await this.repository.findBySlug(
            dto.slug,
        );

        if (
            existingTenant
        ) {
            throw new ConflictError(
                TENANT_ERRORS.SLUG_EXISTS,
            );
        }

        return this.repository.create(
            dto,
        );
    }

    async findAll() {

        return this.repository.findAll();
    }

    async findById(
        tenantId: string,
    ) {
        return this.repository.findById(
            tenantId,
        );
    }

    async update(
        tenantId: string,
        dto: UpdateTenantDto,
    ) {
        await this.repository.update(
            tenantId,
            dto,
        );
    }

    async delete(
        tenantId: string,
    ) {
        await this.repository.delete(
            tenantId,
        );
    }
}