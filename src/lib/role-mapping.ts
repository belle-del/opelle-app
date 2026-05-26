import type { UserType } from '@/lib/types';
import type { TeamRole } from '@/lib/permissions';

export type { UserType };

export function userTypeToRole(userType: UserType): TeamRole {
  switch (userType) {
    case 'student':       return 'student';
    case 'practitioner':  return 'stylist';
    case 'salon_owner':   return 'owner';
    case 'school_admin':  return 'admin';
  }
}

export function roleToUserType(role: TeamRole): UserType {
  switch (role) {
    case 'owner':       return 'salon_owner';
    case 'admin':       return 'school_admin';
    case 'instructor':  return 'practitioner';
    case 'stylist':     return 'practitioner';
    case 'student':     return 'student';
    case 'front_desk':  return 'practitioner';
  }
}
