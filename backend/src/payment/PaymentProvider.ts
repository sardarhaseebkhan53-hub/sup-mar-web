export interface ProviderCreateInput { reference: string; amount: number; currency: string; description: string; metadata: Record<string, string>; returnUrl?: string; }
export interface ProviderPayment { providerPaymentId: string; status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'; checkoutUrl?: string; }
export interface WebhookEvent { eventId: string; providerPaymentId: string; reference: string; status: ProviderPayment['status']; amount: number; currency: string; }
export interface PaymentProvider {
  name: string;
  createCheckout(input: ProviderCreateInput): Promise<ProviderPayment>;
  verifyPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(providerPaymentId: string, amount: number): Promise<ProviderPayment>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPayment>;
  verifyWebhook(rawBody: string, signature: string): WebhookEvent;
}
