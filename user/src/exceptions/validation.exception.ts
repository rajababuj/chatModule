import { ValidationPipe } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { ValidationError } from "class-validator";

export const validationPipe = new ValidationPipe({
    transform: true,
    validationError: { target: false, value: false },
    skipMissingProperties: false,
    exceptionFactory: (errors) => {
        const errMsg = {};
        const formatError = (errors: ValidationError[]) => {
            errors.forEach((error: ValidationError) => {
                if (error.children.length) {
                    formatError(error.children)
                } else {
                    errMsg[error.property] = Object.values(error.constraints)[0];
                }
            });
            return errMsg;
        };

        throw new RpcException({ errors : formatError(errors)});
    },
});