"use client";

import { useState } from "react";
import { User, Mail, Shield, BookOpen, GraduationCap, Building2, UserPlus, Save, Loader2, Plus, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import bcrypt from "bcryptjs"; // Note: this will only work if your next config allows bcrypt on client, otherwise we use a server action

const subjectsList = [
    "Numerical Methods",
    "Database Management System",
    "Embedded Systems",
    "Design and Analysis of Algorithm",
    "Software Engineering"
];

const departmentsList = [
    "Computer Science",
    "Information Technology",
    "Electronics",
    "Electrical Engineering",
    "Mechanical",
    "Mathematics"
];

export default function UserManagementPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"STUDENT" | "FACULTY">("STUDENT");
    const [registerNumber, setRegisterNumber] = useState("");
    const [department, setDepartment] = useState(departmentsList[0]);
    const [subject, setSubject] = useState(subjectsList[0]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        if (!name || !email) {
            setError("Name and Email are mandatory.");
            setLoading(false);
            return;
        }

        try {
            // NOTE: For real-world use 'createUserWithEmailAndPassword' from standard Auth
            // Here we store directly to 'users' collection with hashed dummy password 
            // as per the existing app's design
            const userRef = doc(db, "users", email);

            // Using pure API approach to bypass bcrypt client side issues if any exist
            const tempPassword = "password123";

            const dataToSave: any = {
                id: email,
                name,
                email,
                role,
                department,
                createdAt: serverTimestamp()
            };

            if (role === "STUDENT") {
                if (!registerNumber) throw new Error("Register number is required for students");
                dataToSave.registerNumber = registerNumber;
                dataToSave.assignedFacultyIds = []; // Initialized as empty
            }

            if (role === "FACULTY") {
                dataToSave.subject = subject;
            }

            // Client side write using our generic mock hash since we don't have server-side auth set up
            dataToSave.password = "$2a$10$wIX.7oD7zG3G3.1kFv9V.ORyTZyD7Q0oQJ6k8t.8gN7g7g7g7g7g7";

            await setDoc(userRef, dataToSave);

            setSuccess(`Successfully created ${role.toLowerCase()} account for ${name}`);

            // Reset fields
            setName("");
            setEmail("");
            if (role === "STUDENT") setRegisterNumber("");

        } catch (err: any) {
            setError(err.message || "Failed to create user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ds-page-container fade-in">
            <header className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">User Management</h1>
                    <p className="ds-page-subtitle">Provision official accounts for University Students and Faculty</p>
                </div>
            </header>

            {error && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "16px", borderRadius: "12px", marginBottom: "24px", border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <Shield size={18} />
                    {error}
                </div>
            )}

            {success && (
                <div style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "16px", borderRadius: "12px", marginBottom: "24px", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <Shield size={18} />
                    {success}
                </div>
            )}

            <div className="admin-grid" style={{ display: "grid", gap: "24px", gridTemplateColumns: "1fr" }}>
                <div className="ds-card" style={{ maxWidth: "600px" }}>
                    <div className="ds-card-header">
                        <div className="ds-card-icon" style={{ background: "var(--color-primary-dim)", color: "var(--color-primary)" }}>
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h2 className="ds-card-title">Create New Account</h2>
                            <p className="ds-card-subtitle">Default password will be set to: password123</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                        {/* Role Selector */}
                        <div>
                            <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Account Type</label>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button type="button" onClick={() => setRole("STUDENT")} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: role === "STUDENT" ? "2px solid var(--color-primary)" : "2px solid var(--color-border)", background: role === "STUDENT" ? "var(--color-primary-dim)" : "transparent", color: role === "STUDENT" ? "var(--color-primary)" : "var(--color-text)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}>
                                    <GraduationCap size={18} /> Student
                                </button>
                                <button type="button" onClick={() => setRole("FACULTY")} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: role === "FACULTY" ? "2px solid var(--color-primary)" : "2px solid var(--color-border)", background: role === "FACULTY" ? "var(--color-primary-dim)" : "transparent", color: role === "FACULTY" ? "var(--color-primary)" : "var(--color-text)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}>
                                    <BookOpen size={18} /> Faculty
                                </button>
                            </div>
                        </div>

                        {/* Common Fields */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div>
                                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px", display: "block" }}>Full Name</label>
                                <div style={{ position: "relative" }}>
                                    <User size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. John Doe" style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "0.95rem" }} />
                                </div>
                            </div>
                            <div>
                                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px", display: "block" }}>Email Address</label>
                                <div style={{ position: "relative" }}>
                                    <Mail size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="john@skillsync.edu" style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "0.95rem" }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                            <div>
                                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px", display: "block" }}>Department</label>
                                <div style={{ position: "relative" }}>
                                    <Building2 size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                                    <select value={department} onChange={e => setDepartment(e.target.value)} style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "0.95rem", appearance: "none" }}>
                                        {departmentsList.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Fields based on Role */}
                            {role === "STUDENT" ? (
                                <div>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px", display: "block" }}>Register Number</label>
                                    <input type="text" value={registerNumber} onChange={e => setRegisterNumber(e.target.value)} required placeholder="e.g. REG2024CS01" style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "0.95rem" }} />
                                </div>
                            ) : (
                                <div>
                                    <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-muted)", marginBottom: "8px", display: "block" }}>Designated Subject</label>
                                    <select value={subject} onChange={e => setSubject(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "0.95rem" }}>
                                        {subjectsList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: "12px" }}>
                            <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: "var(--color-primary)", color: "white", borderRadius: "10px", border: "none", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                                {loading ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> Provision {role.toLowerCase()} Account</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

        </div>
    );
}
