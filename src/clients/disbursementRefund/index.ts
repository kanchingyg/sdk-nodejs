/**
 * DisbursementRefund client for the MercadoPago API.
 *
 * Enables full and partial refunds of individual disbursements within an
 * advanced (split) payment.
 *
 * @module disbursementRefund
 */
import listAll from './listAll';
import createAll from './createAll';
import create from './create';

import type { DisbursementRefundResponse } from './commonTypes';
import type { DisbursementRefundListAllData, DisbursementRefundListAllResponse } from './listAll/types';
import type { DisbursementRefundCreateAllData } from './createAll/types';
import type { DisbursementRefundCreateData } from './create/types';

import type { MercadoPagoConfig } from '@src/mercadoPagoConfig';

export class DisbursementRefund {
	private config: MercadoPagoConfig;

	constructor(mercadoPagoConfig: MercadoPagoConfig) {
		this.config = mercadoPagoConfig;
	}

	/**
	 * List all refunds for an advanced payment.
	 */
	listAll({ advancedPaymentId, requestOptions }: DisbursementRefundListAllData): Promise<DisbursementRefundListAllResponse> {
		return listAll({ advancedPaymentId, config: this.config.withOptions(requestOptions) });
	}

	/**
	 * Refund all disbursements of an advanced payment at once.
	 */
	createAll({ advancedPaymentId, body, requestOptions }: DisbursementRefundCreateAllData): Promise<DisbursementRefundResponse> {
		return createAll({ advancedPaymentId, body, config: this.config.withOptions(requestOptions) });
	}

	/**
	 * Refund a specific disbursement by amount.
	 */
	create({ advancedPaymentId, disbursementId, body, requestOptions }: DisbursementRefundCreateData): Promise<DisbursementRefundResponse> {
		return create({ advancedPaymentId, disbursementId, body, config: this.config.withOptions(requestOptions) });
	}
}
