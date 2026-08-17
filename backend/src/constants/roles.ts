export const USER_ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
});

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export const ROLE_VALUES = ['customer', 'seller', 'admin', 'super_admin', 'moderator', 'support'] as const satisfies readonly UserRole[];
