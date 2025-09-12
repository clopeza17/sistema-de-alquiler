import dayjs from 'dayjs'
import 'dayjs/locale/es'

dayjs.locale('es')

// Formatear moneda en Quetzales (GTQ)
export function formatCurrencyGTQ(amount: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(amount)
}

// Formatear fecha en formato dd/mm/aaaa
export function formatDateGT(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY')
}

// Formatear fecha y hora en formato dd/mm/aaaa HH:mm
export function formatDateTimeGT(date: string | Date): string {
  return dayjs(date).format('DD/MM/YYYY HH:mm')
}

// Convertir fecha de formato dd/mm/aaaa a YYYY-MM-DD para backend
export function parseDateToBackend(dateString: string): string {
  const [day, month, year] = dateString.split('/')
  return `${year}-${month}-${day}`
}

// Formatear número con separadores de Guatemala
export function formatNumberGT(number: number): string {
  return new Intl.NumberFormat('es-GT').format(number)
}
