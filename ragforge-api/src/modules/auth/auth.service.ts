import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserRole } from "../users/users.constants.js";
import { UsersService } from "../users/users.service.js";
import { AuthKeyService } from "./auth_key/auth-key.service.js";
import { AuthResponse } from "./interfaces/auth-response.interface.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { env } from "../../config/env.config.js";
import {
    PASSWORD_SALT_ROUNDS,
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    REFRESH_TOKEN_EXPIRY_MS,
} from "./auth.constants.js";
import crypto from "crypto";
import { AuthRepository } from "./auth.repository.js";
import {
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "../../common/errors/index.js";
import { TenantsService } from "../tenants/tenants.service.js";


export class AuthService {

    private readonly usersService = new UsersService();
    private readonly authKeyService = new AuthKeyService();
    private readonly authRepository = new AuthRepository();
    private readonly tenantsService = new TenantsService();
    private readonly saltRounds = PASSWORD_SALT_ROUNDS;

    async register(
        dto: RegisterDto,
    ): Promise<AuthResponse> {

        const existingUser = await this.usersService.findByEmail(
            dto.email,
        );

       if (existingUser) {
            throw new ConflictError(
                "User already exists",
            );
        }

        // Resolve tenant: use the provided one, or auto-create a new one
        let tenantId = dto.tenantId;
        if (!tenantId) {
            const slug = dto.email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "-")
                .slice(0, 50)
                + "-" + Date.now();
            tenantId = await this.tenantsService.create({
                name: `${dto.firstName} ${dto.lastName}'s Workspace`,
                slug,
            });
        }

        const passwordHash = await this.hashPassword(
            dto.password,
        );

        const userId = await this.usersService.create({
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: UserRole.USER,
            tenantId,
        });

        const user = await this.usersService.findById(
            userId,
        );

        if (!user) {
            throw new NotFoundError(
                "User",
            );
        }

        return this.generateTokens(
            user,
        );
    }

    async login(
        dto: LoginDto,
    ): Promise<AuthResponse> {

        const user = await this.usersService.findByEmail(
            dto.email,
        );

        if (!user) {
            throw new NotFoundError(
                "User",
            );
        }

        const isValid = await this.comparePassword(
            dto.password,
            user.passwordHash,
        );

        if (!isValid) {
            throw new UnauthorizedError(
                "Invalid credentials",
            );
        }

        if (!user.isActive) {
            throw new ForbiddenError(
                "User account is inactive",
            );
        }

        return this.generateTokens(
            user,
        );
    }

    private async generateTokens(
        user: {
            id: string;
            email: string;
            role: string;
            tenantId: string | null;
        },
    ): Promise<AuthResponse> {

        const activeKey = await this.authKeyService.getOrCreateActiveKey();

        const accessTokenOptions: SignOptions = {
            algorithm: "RS256",
            keyid: activeKey.kid,
            expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
        };

        const accessToken = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                kid: activeKey.kid,
                typ: ACCESS_TOKEN_TYPE,
                tenantId: user.tenantId,
            },
            activeKey.privateKey,
            accessTokenOptions,
        );

        const refreshTokenOptions: SignOptions = {
            algorithm: "RS256",
            keyid: activeKey.kid,
            expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"],
        };

        const refreshToken = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                role: user.role,
                kid: activeKey.kid,
                typ: REFRESH_TOKEN_TYPE,
                tenantId: user.tenantId,
            },
            activeKey.privateKey,
            refreshTokenOptions,
        );

        const refreshTokenHash = this.hashToken(
            refreshToken,
        );

        await this.authRepository.createRefreshToken({
            userId: user.id,
            tokenHash: refreshTokenHash,
            revoked: false,
            expiresAt: this.getRefreshTokenExpiry(),
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    }

    private async hashPassword(
        password: string,
    ): Promise<string> {
        return bcrypt.hash(
            password,
            this.saltRounds,
        );
    }

    private async comparePassword(
        password: string,
        hash: string,
    ): Promise<boolean> {
        return bcrypt.compare(
            password,
            hash,
        );
    }

    private hashToken(
        token: string,
    ): string {

        return crypto
            .createHash(
                "sha256",
            )
            .update(
                token,
            )
            .digest(
                "hex",
            );
    }

    private getRefreshTokenExpiry(): Date {

        return new Date(
            Date.now() +
            REFRESH_TOKEN_EXPIRY_MS,
        );
    }

    async refresh(
        refreshToken: string,
    ): Promise<AuthResponse> {

        const decoded = jwt.decode(
            refreshToken,
        ) as jwt.JwtPayload | null;

        if (!decoded) {
            throw new UnauthorizedError(
                "Invalid refresh token",
            );
        }

        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.authRepository.findActiveToken(
            tokenHash,
        );

        if (!storedToken) {
            throw new UnauthorizedError(
                "Refresh token revoked",
            );
        }

        await this.authRepository.revokeToken(
            storedToken.id,
        );

        const user = await this.usersService.findById(
            decoded.sub!,
        );

        if (!user) {
            throw new Error(
                "User not found",
            );
        }

        return this.generateTokens(
            user,
        );
    }

    async logout(
        refreshToken: string,
    ): Promise<void> {

        const tokenHash = this.hashToken(refreshToken);

        const storedToken = await this.authRepository.findActiveToken(
            tokenHash,
        );

        if (!storedToken) {
            return;
        }

        await this.authRepository.revokeToken(
            storedToken.id,
        );
    }

    async logoutAll(
        userId: string,
    ): Promise<void> {
        await this.authRepository.revokeAllUserTokens(userId);
    }
}