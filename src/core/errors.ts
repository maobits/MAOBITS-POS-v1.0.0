/** MAOBITS POS — Errores de dominio traducibles. */
export class AppError extends Error {
    constructor(public readonly code: string, public readonly meta?: Record<string, unknown>) {
        super(code);
        this.name = 'AppError';
    }
}
export function errorCode(error: unknown): string {
    if (error instanceof AppError)
        return error.code;
    if (error instanceof Error)
        return error.message;
    return 'errors.unknown';
}

