import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function getCanonicalAuthEmail(username: string) {
  return `${normalizeUsername(username)}@werkudara.com`
}
