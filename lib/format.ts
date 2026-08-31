export function formatPrice(price: number, suffix?: string) {
  return `${new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(price)}${suffix ? ` ${suffix}` : ''}`;
}

export function formatArea(area: number) {
  return `${new Intl.NumberFormat('en-PH').format(area)} sqm`;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}
