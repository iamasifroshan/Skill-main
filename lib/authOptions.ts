import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const email = credentials.email.toLowerCase();
                const userRef = doc(db, "users", email);
                const userSnap = await getDoc(userRef);

                let user;
                if (!userSnap.exists()) {
                    // Detect role from email pattern
                    let role = "STUDENT";
                    if (email.includes(".admin")) role = "ADMIN";
                    else if (email.includes(".faculty")) role = "FACULTY";

                    // For the purpose of this upgrade, if the user doesn't exist, we'll create them with the password provided
                    // This allows the existing "mock login" feel but with real persistence.
                    const hashedPassword = await bcrypt.hash(credentials.password, 10);
                    user = {
                        id: email,
                        email,
                        name: email.split("@")[0].split(".")[0],
                        role,
                        password: hashedPassword,
                    };
                    await setDoc(userRef, user);
                } else {
                    user = userSnap.data();
                }

                if (!user || !user.password) return null;

                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) return null;

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                } as any;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    useSecureCookies: false,
};
