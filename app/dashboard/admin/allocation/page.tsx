"use client";

import { useState, useEffect } from "react";
import { User, Users, Plus, X, Search, GraduationCap, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function StudentAllocationPage() {
    const [faculties, setFaculties] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Load Faculties & Students
    useEffect(() => {
        // Fetch Faculty
        const qFaculty = query(collection(db, "users"), where("role", "==", "FACULTY"));
        const unsubFac = onSnapshot(qFaculty, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFaculties(list);
            if (list.length > 0 && !selectedFaculty) {
                setSelectedFaculty(list[0]);
            }
        });

        // Fetch Students
        const qStudents = query(collection(db, "users"), where("role", "==", "STUDENT"));
        const unsubStu = onSnapshot(qStudents, (snap) => {
            setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubFac();
            unsubStu();
        };
    }, []);

    const toggleStudentAssignment = async (student: any) => {
        if (!selectedFaculty) return;

        const isAssigned = student.assignedFacultyIds?.includes(selectedFaculty.id);
        const studentRef = doc(db, "users", student.id);

        try {
            if (isAssigned) {
                await updateDoc(studentRef, {
                    assignedFacultyIds: arrayRemove(selectedFaculty.id)
                });
            } else {
                await updateDoc(studentRef, {
                    assignedFacultyIds: arrayUnion(selectedFaculty.id)
                });
            }
        } catch (error) {
            console.error("Failed to update allocation:", error);
            alert("Error updating assignment. Check console.");
        }
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.registerNumber || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="ds-page-container fade-in">
            <header className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">Student Allocation</h1>
                    <p className="ds-page-subtitle">Assign students to specific faculty members in real-time</p>
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "24px" }}>

                {/* Left: Faculty List */}
                <div className="ds-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", background: "rgba(255, 255, 255, 0.02)" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                            <Users size={18} color="var(--color-primary)" />
                            Faculty Roster ({faculties.length})
                        </h3>
                    </div>

                    <div style={{ overflowY: "auto", flex: 1, padding: "12px" }}>
                        {faculties.map(faculty => (
                            <button
                                key={faculty.id}
                                onClick={() => setSelectedFaculty(faculty)}
                                style={{
                                    width: "100%", textAlign: "left", padding: "16px", borderRadius: "12px", border: "none",
                                    background: selectedFaculty?.id === faculty.id ? "var(--color-primary-dim)" : "transparent",
                                    marginBottom: "8px", cursor: "pointer", transition: "all 0.2s",
                                    display: "flex", alignItems: "center", gap: "12px"
                                }}
                            >
                                <div style={{
                                    width: "40px", height: "40px", borderRadius: "50%",
                                    background: selectedFaculty?.id === faculty.id ? "var(--color-primary)" : "var(--color-surface-hover)",
                                    color: selectedFaculty?.id === faculty.id ? "white" : "var(--color-text)",
                                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem"
                                }}>
                                    {faculty.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div style={{ overflow: "hidden" }}>
                                    <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {faculty.name}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                                        {faculty.subject || faculty.department || "No Subject"}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Allocation Panel */}
                <div className="ds-card" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
                    {selectedFaculty ? (
                        <>
                            <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                <div>
                                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 4px 0" }}>Managing: {selectedFaculty.name}</h2>
                                    <p style={{ color: "var(--color-muted)", margin: 0, fontSize: "0.9rem" }}>Toggle the checkbox to assign or unassign students instantly.</p>
                                </div>
                                <div style={{ position: "relative", width: "260px" }}>
                                    <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                                    <input
                                        type="text"
                                        placeholder="Search student or ID..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ width: "100%", padding: "10px 14px 10px 38px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", fontSize: "0.9rem" }}
                                    />
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "12px" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead style={{ background: "rgba(255, 255, 255, 0.02)", position: "sticky", top: 0, zIndex: 1, backdropFilter: "blur(10px)" }}>
                                        <tr>
                                            <th style={{ padding: "16px", textAlign: "left", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>Status</th>
                                            <th style={{ padding: "16px", textAlign: "left", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>Student</th>
                                            <th style={{ padding: "16px", textAlign: "left", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>Register No.</th>
                                            <th style={{ padding: "16px", textAlign: "left", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>Department</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                            const isAssigned = student.assignedFacultyIds?.includes(selectedFaculty.id);
                                            return (
                                                <tr key={student.id} style={{ borderBottom: "1px solid var(--color-border)", transition: "background 0.2s" }} className="hover-row">
                                                    <td style={{ padding: "16px", verticalAlign: "middle" }}>
                                                        <button
                                                            onClick={() => toggleStudentAssignment(student)}
                                                            style={{
                                                                width: "28px", height: "28px", borderRadius: "8px", border: "none", cursor: "pointer",
                                                                background: isAssigned ? "var(--color-primary)" : "var(--color-surface-hover)",
                                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)"
                                                            }}
                                                        >
                                                            {isAssigned ? <CheckCircle2 size={16} color="white" /> : <Plus size={16} color="var(--color-muted)" />}
                                                        </button>
                                                    </td>
                                                    <td style={{ padding: "16px", fontWeight: 600 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-surface-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "var(--color-text)" }}>
                                                                {student.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            {student.name}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "16px", color: "var(--color-muted)", fontSize: "0.9rem", fontFamily: "monospace" }}>
                                                        {student.registerNumber || "N/A"}
                                                    </td>
                                                    <td style={{ padding: "16px", color: "var(--color-muted)", fontSize: "0.9rem" }}>
                                                        {student.department}
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--color-muted)" }}>
                                                    <GraduationCap size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                                                    No students found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-muted)", opacity: 0.7 }}>
                            <Users size={48} style={{ marginBottom: "16px" }} />
                            <h3>Select a Faculty Member</h3>
                            <p>Choose a faculty from the roster to manage their student allocations.</p>
                        </div>
                    )}
                </div>

            </div>

            <style jsx>{`
                .hover-row:hover { background: rgba(255, 255, 255, 0.02); }
            `}</style>
        </div>
    );
}
