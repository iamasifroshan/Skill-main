import dotenv from "dotenv";
dotenv.config();
import { db } from "./lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import bcrypt from "bcryptjs";

async function seedFirestoreUsers() {
    console.log("Seeding Firestore users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const users = [
        {
            id: "admin.admin@skillsync.com",
            name: "Admin User",
            email: "admin.admin@skillsync.com",
            password: hashedPassword,
            role: "ADMIN"
        },
        {
            id: "sarahsmith.faculty@skillsync.com",
            name: "Dr. Sarah Smith",
            email: "sarahsmith.faculty@skillsync.com",
            password: hashedPassword,
            role: "FACULTY",
            subject: "Software Engineering",
            department: "Computer Science"
        },
        {
            id: "faculty.faculty@skillsync.com",
            name: "Faculty User",
            email: "faculty.faculty@skillsync.com",
            password: hashedPassword,
            role: "FACULTY"
        },
        {
            id: "aaravsharma.student@skillsync.com",
            name: "Aarav Sharma",
            email: "aaravsharma.student@skillsync.com",
            password: hashedPassword,
            role: "STUDENT",
            registerNumber: "REG2024CS01",
            department: "Computer Science",
            assignedFacultyIds: ["sarahsmith.faculty@skillsync.com"]
        },
        {
            id: "student.student@skillsync.com",
            name: "Student User",
            email: "student.student@skillsync.com",
            password: hashedPassword,
            role: "STUDENT"
        }
    ];

    for (const user of users) {
        await setDoc(doc(db, "users", user.id), {
            ...user,
            createdAt: serverTimestamp()
        });
        console.log(`Seeded: ${user.email}`);
    }

    console.log("Firestore seeding complete.");
}

seedFirestoreUsers().catch(console.error);
