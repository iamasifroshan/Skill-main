import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import bcrypt from "bcryptjs";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const snapshot = await getDocs(collection(db, "users"));
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                email: data.email,
                role: data.role,
                department: data.department,
                createdAt: data.createdAt,
            };
        });

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        // ─── DELETION Logic ───
        if (body.action === "delete") {
            const { email } = body.payload;
            if (!email) return NextResponse.json({ error: "Email required for deletion." }, { status: 400 });

            await deleteDoc(doc(db, "users", email));
            return NextResponse.json({ success: true, message: `Account ${email} deleted.` });
        }

        // ─── CREATION Logic ───
        const { payload } = body;
        const { name, email, role, department, registerNumber, subject } = payload;

        if (!email || !name) {
            return NextResponse.json({ error: "Name and email required." }, { status: 400 });
        }

        const userRef = doc(db, "users", email.trim().toLowerCase());
        const hashedPassword = await bcrypt.hash("password123", 10);

        const dataToSave: any = {
            id: email.trim().toLowerCase(),
            name,
            email: email.trim().toLowerCase(),
            role,
            department,
            password: hashedPassword,
            createdAt: serverTimestamp()
        };

        if (role === "STUDENT") {
            if (!registerNumber) return NextResponse.json({ error: "Register number required for Student." }, { status: 400 });
            dataToSave.registerNumber = registerNumber;
            dataToSave.assignedFacultyIds = [];
        }

        if (role === "FACULTY") {
            dataToSave.subject = subject;
        }

        await setDoc(userRef, dataToSave);

        return NextResponse.json({ success: true, user: dataToSave });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
    }
}
