import { AppError } from "./app.error.js";
import {
    HTTP_STATUS,
    ERROR_CODES,
} from "../../constants/http.constants.js";

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(
            `${resource} not found`,
            HTTP_STATUS.NOT_FOUND,
            ERROR_CODES.NOT_FOUND,
        );
    }
}

export class BadRequestError extends AppError {
    constructor(message: string) {
        super(
            message,
            HTTP_STATUS.BAD_REQUEST,
            ERROR_CODES.BAD_REQUEST,
        );
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(
            message,
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.CONFLICT,
        );
    }
}

export class UnauthorizedError
extends AppError {

    constructor(
        message = "Unauthorized",
    ) {

        super(
            message,
            HTTP_STATUS.UNAUTHORIZED,
            ERROR_CODES.UNAUTHORIZED,
        );
    }
}

export class ForbiddenError
extends AppError {

    constructor(
        message = "Forbidden",
    ) {

        super(
            message,
            HTTP_STATUS.FORBIDDEN,
            ERROR_CODES.FORBIDDEN,
        );
    }
}