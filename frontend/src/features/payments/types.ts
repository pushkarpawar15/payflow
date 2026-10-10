export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED'
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP'
export type Payment = Readonly<{ id: string; customer: string; amount: string; currency: Currency; status: PaymentStatus; createdAt: string; updatedAt: string }>
export type PaymentInput = Readonly<{ customer: string; amount: string; currency: Currency }>
