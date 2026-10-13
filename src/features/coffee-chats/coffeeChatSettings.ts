export const COFFEE_CHAT_REQUIRES_CONFIRMATION_KEY = 'coffee_chat_requires_confirmation';

/** Missing setting keeps the current behavior: the other person must confirm. */
export function coffeeChatsRequireConfirmation(value: unknown): boolean {
  return value !== false;
}
