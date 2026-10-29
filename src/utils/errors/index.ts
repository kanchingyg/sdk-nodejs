/**
 * Typed exception hierarchy for MercadoPago API errors.
 *
 * All exceptions extend {@link MercadoPagoError}, which itself extends {@link Error}.
 * Existing code that checks `error.status`, `error.message`, `error.error`, or
 * `error.causes` continues to work unchanged.
 *
 * CWE-209: The `Authorization` header value is never stored in error objects;
 * errors are built from the API *response* body, not the outgoing request.
 */

/** Shape of the raw error body returned by the MercadoPago API. */
export interface OrderApiErrorItem {
	code?: string;
	message?: string;
	details?: string[];
	[key: string]: unknown;
}

interface ApiErrorBody {
    status?: number;
    message?: string;
    error?: string;
    cause?: unknown[];
    errors?: OrderApiErrorItem[];
    [key: string]: unknown;
}

/**
 * Base class for all MercadoPago API errors.
 *
 * Preserves backward-compatible properties (`status`, `message`, `error`, `causes`)
 * and also normalises Orders API `errors` arrays (`{ errors: [{ code, message, details }] }`).
 */
export class MercadoPagoError extends Error {
	readonly status: number;
	readonly error: string;
	readonly causes: unknown[];
	readonly errors: OrderApiErrorItem[];

	constructor(body: ApiErrorBody) {
		const orderErrors = Array.isArray(body.errors) ? body.errors : [];
		const firstOrderErr = orderErrors[0];
		const firstDetail = Array.isArray(firstOrderErr?.details) && firstOrderErr.details.length > 0
			? `: ${firstOrderErr.details.join('; ')}`
			: '';
		const orderMsg = firstOrderErr?.message
			? `${firstOrderErr.message}${firstDetail}`
			: undefined;
		const msg = body.message || orderMsg || body.error || firstOrderErr?.code || 'MercadoPago API error';
		super(msg);
		this.name = this.constructor.name;
		this.status = body.status ?? 0;
		this.error = body.error ?? firstOrderErr?.code ?? '';
		this.causes = body.cause ?? orderErrors;
		this.errors = orderErrors;
		// Maintain prototype chain in compiled JavaScript
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/** HTTP 400 Bad Request — validation or syntax error. */
export class MPBadRequestError extends MercadoPagoError {}

/** HTTP 401 Unauthorized — missing or invalid credentials. */
export class MPAuthenticationError extends MercadoPagoError {}

/** HTTP 402 Payment Required — transaction processing error (AP/Orders). */
export class MPPaymentError extends MercadoPagoError {}

/** HTTP 403 Forbidden. */
export class MPForbiddenError extends MercadoPagoError {}

/** HTTP 404 Not Found. */
export class MPNotFoundError extends MercadoPagoError {}

/**
 * HTTP 409 Conflict — idempotency-key conflict or state-machine conflict.
 * Use `MPOrderErrors` constants to distinguish sub-cases via `error.error`.
 */
export class MPIdempotencyError extends MercadoPagoError {}

/** HTTP 422 Unprocessable Entity — business-rule violation. */
export class MPValidationError extends MercadoPagoError {}

/** HTTP 423 Locked — idempotency key temporarily locked (retryable). */
export class MPResourceLockedError extends MercadoPagoError {}

/** HTTP 424 Failed Dependency — internal dependency failure (retryable). */
export class MPDependencyError extends MercadoPagoError {}

/**
 * HTTP 429 Too Many Requests.
 * Exposes `retryAfter` (seconds) from the `Retry-After` response header.
 */
export class MPRateLimitError extends MercadoPagoError {
	readonly retryAfter: number | null;

	constructor(body: ApiErrorBody, retryAfter: number | null = null) {
		super(body);
		this.retryAfter = retryAfter;
	}
}

/** HTTP 5xx Server Error. */
export class MPServerError extends MercadoPagoError {}

/** Transport-level or network error (timeout, DNS failure, etc.). */
export class MPConnectionError extends MercadoPagoError {
	constructor(cause: unknown) {
		const msg = cause instanceof Error ? cause.message : String(cause);
		super({ message: msg, error: 'connection_error' });
		this.__cause__ = cause;
	}
	private __cause__: unknown;
}

const STATUS_MAP: Record<number, new (body: ApiErrorBody) => MercadoPagoError> = {
	400: MPBadRequestError,
	401: MPAuthenticationError,
	402: MPPaymentError,
	403: MPForbiddenError,
	404: MPNotFoundError,
	409: MPIdempotencyError,
	422: MPValidationError,
	423: MPResourceLockedError,
	424: MPDependencyError,
};

/**
 * Factory: maps an HTTP status code to the most specific error subtype.
 *
 * @param status      HTTP status code from the API response.
 * @param body        Parsed API error body.
 * @param retryAfter  Seconds from the `Retry-After` header (only for 429).
 */
export function buildError(status: number, body: ApiErrorBody, retryAfter: number | null = null): MercadoPagoError {
	if (status === 429) return new MPRateLimitError({ ...body, status }, retryAfter);
	const Cls = STATUS_MAP[status];
	if (Cls) return new Cls({ ...body, status });
	if (status >= 500) return new MPServerError({ ...body, status });
	return new MercadoPagoError({ ...body, status });
}
