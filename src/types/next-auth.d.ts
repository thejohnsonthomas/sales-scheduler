import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      enabled: boolean;
      segments: { id: string; name: string }[];
      regions: { id: string; name: string }[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    enabled: boolean;
    segments: { id: string; name: string }[];
    regions: { id: string; name: string }[];
  }
}
