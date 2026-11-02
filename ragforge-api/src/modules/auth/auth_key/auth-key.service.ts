import {
    generateKeyPairSync,
    randomUUID,
} from "crypto";

import {
    JWT_ALGORITHM,
    RSA_KEY_SIZE,
} from "../auth.constants.js";

import { AuthKeyRepository } from "./auth-key.repository.js";

export class AuthKeyService {

    private readonly repository = new AuthKeyRepository();

    async getOrCreateActiveKey() {

        const activeKey = await this.repository.getActiveKey();
        if (activeKey) {
            return activeKey;
        }

        return this.generateKeyPair();
    }

    async generateKeyPair() {

        const {
            privateKey,
            publicKey,
        } =
            generateKeyPairSync(
                "rsa",
                {
                    modulusLength: RSA_KEY_SIZE,
                    privateKeyEncoding: {
                        format: "pem",
                        type: "pkcs8",
                    },

                    publicKeyEncoding: {
                        format: "pem",
                        type: "spki",
                    },
                },
            );

        await this.repository.deactivateAll();

        const kid = randomUUID();

        const id = await this.repository.create({
            kid,
            algorithm: JWT_ALGORITHM,
            publicKey,
            privateKey,
            isActive: true,
        });

        return {
            id,
            kid,
            publicKey,
            privateKey,
            isActive: true,
        };
    }

    async findByKid(
        kid: string,
    ) {

        return this.repository.findByKid(
            kid,
        );
    }
}