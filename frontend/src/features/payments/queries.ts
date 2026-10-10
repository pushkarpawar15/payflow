import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPayment, getPayment, listPayments } from './paymentApi'
import { PaymentInput } from './types'

export const paymentKeys = { root: ['payments'] as const, lists: () => ['payments', 'list'] as const, list: (filters: string) => ['payments', 'list', filters] as const, detail: (id: string) => ['payments', 'detail', id] as const }
export function usePayments() { return useQuery({ queryKey: paymentKeys.list('all'), queryFn: ({ signal }) => listPayments(signal), staleTime: 30_000, retry: 1, refetchOnWindowFocus: false }) }
export function usePayment(id: string) { return useQuery({ queryKey: paymentKeys.detail(id), queryFn: ({ signal }) => getPayment(id, signal), staleTime: 30_000, retry: (count, error) => (error as { status?: number }).status !== 404 && count < 1, refetchOnWindowFocus: false }) }
export function useCreatePayment() {
  const client = useQueryClient()
  return useMutation({ mutationFn: (input: PaymentInput) => createPayment(input), retry: false, onSuccess: async payment => { client.setQueryData(paymentKeys.detail(payment.id), payment); await client.invalidateQueries({ queryKey: paymentKeys.lists() }) } })
}
