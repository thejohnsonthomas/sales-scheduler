import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser && !existingUser.enabled) {
        return false;
      }

      if (account?.refresh_token) {
        await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            googleId: user.id,
            refreshToken: account.refresh_token,
            role: existingUser?.role ?? Role.ACCOUNT_EXECUTIVE,
          },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            refreshToken: account.refresh_token,
          },
        });
      } else if (existingUser) {
        await prisma.user.update({
          where: { email: user.email },
          data: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            googleId: user.id,
            role: Role.ACCOUNT_EXECUTIVE,
          },
        });
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: {
            userSegments: { include: { segment: true } },
            userRegions: { include: { region: true } },
          },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.enabled = dbUser.enabled;
          token.segments = dbUser.userSegments.map((us) => us.segment);
          token.regions = dbUser.userRegions.map((ur) => ur.region);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).enabled = token.enabled;
        (session.user as Record<string, unknown>).segments = token.segments;
        (session.user as Record<string, unknown>).regions = token.regions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  events: {
    async signIn({ user, account }) {
      if (user.email && account?.refresh_token) {
        await prisma.user.update({
          where: { email: user.email },
          data: { refreshToken: account.refresh_token },
        });
      }
    },
  },
};
