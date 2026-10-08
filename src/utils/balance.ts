import type { Customer, CustomerTransaction, Supplier, SupplierTransaction } from '../types'

export function calculateCustomerBalance(
  openingBalance: number,
  openingBalanceType: Customer['openingBalanceType'],
  transactions: CustomerTransaction[] = [],
): number {
  const opening = openingBalance || 0
  const base = openingBalanceType === 'payable' ? -opening : opening

  return transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount) || 0
    if (transaction.type === 'given') {
      return total + amount
    }
    return total - amount
  }, base)
}

export function calculateSupplierBalance(
  openingBalance: number,
  transactions: SupplierTransaction[] = [],
): number {
  const base = openingBalance || 0

  return transactions.reduce((total, transaction) => {
    const amount = Number(transaction.amount) || 0
    if (transaction.type === 'purchase') {
      return total + amount
    }
    return total - amount
  }, base)
}

export function calculateReceivable(totalGiven: number, totalReceived: number): number {
  return Math.max(totalGiven - totalReceived, 0)
}

export function calculatePayable(totalReceived: number, totalGiven: number): number {
  return Math.max(totalReceived - totalGiven, 0)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}
