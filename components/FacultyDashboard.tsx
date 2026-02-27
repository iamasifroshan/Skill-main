"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users, AlertTriangle, TrendingUp, Award, BookOpen,
    Search, ChevronUp, ChevronDown, Download,
    BarChart2, Filter, Clock
} from "lucide-react";

import { getMaterials, saveMaterial, type Material } from "@/lib/materialsStore";
import StudentDetailsModal from "./StudentDetailsModal";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";

// ─── Types ───────────────────────────────────────────────────────────────────
type SortKey = "name" | "roll" | "performance" | "attendance" | "risk";

// ─── Theme-aware tokens ─────────────────────────────────────────────────────
const V = {
    card: "var(--ds-card, rgba(255,255,255,0.025))",
    border: "var(--ds-border, rgba(255,255,255,0.06))",
    text: "var(--ds-text, #fff)",
    dim: "var(--ds-text-dim, #6b6b6b)",
    muted: "var(--ds-text-muted, #3a3a3a)",
    accent: "var(--ds-accent)",
    accentSoft: "var(--ds-accent-soft)",
    accentBorder: "var(--ds-accent-border)",
    hover: "var(--ds-hover, rgba(255,255,255,0.04))",
    surface: "var(--ds-surface, #ffffff)",
    searchBg: "var(--ds-search-bg, #ffffff)",
};
const FONT_H = "var(--font-display, 'Outfit', sans-serif)";

// ─── Constants ───────────────────────────────────────────────────────────────
const RISK_CFG: Record<string, { color: string; bg: string }> = {
    Low: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    High: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const CLASSES = ["CSE-A (Year 2)", "CSE-B (Year 2)", "CSE-A (Year 3)", "All Classes"];

const CARD: React.CSSProperties = {
    background: V.card, border: `1px solid ${V.border}`,
    borderRadius: "16px", padding: "24px",
    transition: "background 0.3s, border-color 0.3s",
};

const TT = {
    contentStyle: {
        backgroundColor: V.surface, border: `1px solid ${V.border}`,
        borderRadius: "10px", color: V.text, fontSize: "0.85rem",
        fontFamily: "var(--font-body, 'Space Grotesk', sans-serif)",
    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, label, sub }: { icon: any; color?: string; label: string; sub?: string }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: V.accentSoft, border: `1px solid ${V.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={V.accent} />
                </div>
                <h2 style={{ fontFamily: FONT_H, fontSize: "1.1rem", fontWeight: 800, color: V.text, margin: 0, letterSpacing: "-0.02em" }}>{label}</h2>
            </div>
            {sub && <p style={{ fontSize: "0.82rem", color: V.dim, marginTop: 6, marginLeft: 46 }}>{sub}</p>}
        </div>
    );
}

export default function FacultyDashboard({ teacherName, teacherEmail }: { teacherName: string; teacherEmail?: string }) {
    // ── allocation: only show assigned students
    const [dbStudents, setDbStudents] = useState<any[]>([]);

    useEffect(() => {
        if (!teacherEmail) return;

        // Fetch students whose assignedFacultyIds array contains the current faculty's email
        const q = query(
            collection(db, "users"),
            where("role", "==", "STUDENT"),
            where("assignedFacultyIds", "array-contains", teacherEmail)
        );

        const unsub = onSnapshot(q, (snap) => {
            const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDbStudents(students);
        });

        return () => unsub();
    }, [teacherEmail]);

    const MY_STUDENTS = dbStudents
        .map((s: any) => {
            // Mock subjects since we only seeded user accounts right now, 
            // the full structure comes later.
            const avg = s.subjects ? s.subjects.reduce((a: any, b: any) => a + (b.marks || 0), 0) / (s.subjects.length || 1) : 0;
            return {
                ...s,
                roll: s.registerNumber || s.roll || "REG000",
                performance: Math.round(avg),
                gpa: (avg / 10).toFixed(1),
                risk: (s.attendance < 75 || avg < 60) ? "High" : avg < 75 ? "Medium" : "Low",
                skillGaps: s.skillGaps || [],
            };
        });

    // ── computed stats
    const total = MY_STUDENTS.length;
    const atRisk = MY_STUDENTS.filter((s) => s.risk === "High").length;
    const medRisk = MY_STUDENTS.filter((s) => s.risk === "Medium").length;
    const avgPerf = total ? Math.round(MY_STUDENTS.reduce((a, b) => a + b.performance, 0) / total) : 0;
    const avgAtt = total ? Math.round(MY_STUDENTS.reduce((a, b) => a + b.attendance, 0) / total) : 0;
    const riskPie = [
        { name: "Low Risk", value: MY_STUDENTS.filter(s => s.risk === "Low").length, color: "#10b981" },
        { name: "Medium Risk", value: medRisk, color: "#f59e0b" },
        { name: "High Risk", value: atRisk, color: "#ef4444" },
    ];

    // ── student table state
    const [searchQuery, setSearchQuery] = useState("");
    const [riskFilter, setRiskFilter] = useState("All");
    const [sortKey, setSortKey] = useState<SortKey>("roll");
    const [sortAsc, setSortAsc] = useState(true);

    const filtered = MY_STUDENTS
        .filter(s =>
            (riskFilter === "All" || s.risk === riskFilter) &&
            (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.roll.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            const av = a[sortKey] ?? "", bv = b[sortKey] ?? "";
            if (typeof av === "number" && typeof bv === "number")
                return sortAsc ? av - bv : bv - av;
            return sortAsc
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortAsc(!sortAsc);
        else { setSortKey(k); setSortAsc(true); }
    };
    const SortIcon = ({ k }: { k: SortKey }) =>
        sortKey === k
            ? (sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
            : <ChevronDown size={13} style={{ opacity: 0.25 }} />;

    const exportReport = () => {
        const rows = filtered.map(s => `${s.roll}\t${s.name}\t${s.performance}%\t${s.attendance}%\t${s.risk}`).join("\n");
        const blob = new Blob([`Faculty Report — ${teacherName}\n\nRoll\tName\tPerformance\tAttendance\tRisk\n${rows}`], { type: "text/plain" });
        const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "class-report.txt" });
        a.click();
    };

    // ── materials state
    const [materials, setMaterials] = useState<Material[]>([]);
    const [matTitle, setMatTitle] = useState("");
    const [matDesc, setMatDesc] = useState("");
    const [matClass, setMatClass] = useState(CLASSES[0]);
    const [matFile, setMatFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadOk, setUploadOk] = useState(false);
    const [uploadErr, setUploadErr] = useState("");
    const fileRef = { current: null as HTMLInputElement | null };

    useEffect(() => { setMaterials(getMaterials()); }, []);

    const handleFile = (f: File) => {
        const ok = ["application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
        if (!ok.includes(f.type)) { setUploadErr("Only PDF, DOC, DOCX, PPT, PPTX allowed."); return; }
        setUploadErr(""); setMatFile(f);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matTitle.trim() || !matFile) { setUploadErr("Title and file are required."); return; }
        setUploadErr(""); setUploading(true);
        await new Promise(r => setTimeout(r, 1000));
        const m: Material = {
            id: Date.now().toString(), title: matTitle, description: matDesc,
            assignedClass: matClass, fileName: matFile.name,
            fileType: matFile.name.split(".").pop()?.toUpperCase() || "FILE",
            uploadedAt: new Date().toLocaleString(), uploadedBy: teacherName,
        };
        saveMaterial(m);
        setMaterials(getMaterials());
        setMatTitle(""); setMatDesc(""); setMatFile(null); setMatClass(CLASSES[0]);
        setUploading(false); setUploadOk(true);
        setTimeout(() => setUploadOk(false), 3500);
    };

    const extIcon: Record<string, string> = { PDF: "📄", DOC: "📝", DOCX: "📝", PPT: "📊", PPTX: "📊" };
    const [showModal, setShowModal] = useState(false);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const handleSaveStudentDetails = (data: any) => {
        if (selectedStudent) {
            localStorage.setItem(`skillsync-student-data-${selectedStudent.email}`, JSON.stringify(data));
            alert(`Marks for ${selectedStudent.name} updated successfully!`);
        }
    };

    const handleUpdateAttendance = async (student: any) => {
        const val = prompt(`Enter new attendance percentage for ${student.name} (0-100):`, student.attendance);
        if (val === null) return;
        const att = parseInt(val);
        if (isNaN(att) || att < 0 || att > 100) {
            alert("Please enter a valid percentage between 0 and 100.");
            return;
        }

        try {
            const studentRef = doc(db, "users", student.id);
            await updateDoc(studentRef, { attendance: att });
            alert(`Attendance for ${student.name} updated to ${att}% successfully!`);
        } catch (e) {
            console.error("Attendance update failed:", e);
        }
    };

    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

            {/* ─── HEADER ─────────────────────────────────────────── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: V.accent, boxShadow: `0 0 8px ${V.accent}`, display: "inline-block" }} />
                        <span style={{ color: V.accent, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: FONT_H }}>
                            Faculty Dashboard — Student Management
                        </span>
                    </div>
                    <h1 style={{ fontFamily: FONT_H, fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-0.03em", color: V.text, margin: 0 }}>
                        Welcome, <span className="text-gradient">{teacherName}</span>
                    </h1>
                    <p style={{ color: V.dim, marginTop: 6, fontSize: "0.9rem" }}>
                        CSE Year 2 — Class analytics updated at 01:01 IST
                    </p>
                </div>
            </div>

            {/* ─── 1. SUMMARY CARDS ───────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 18 }}>
                {[
                    { label: "Total Students", value: total, sub: "In assigned class", icon: Users },
                    { label: "Students At Risk", value: atRisk, sub: "High risk — immediate", icon: AlertTriangle },
                    { label: "Avg Class Performance", value: `${avgPerf}%`, sub: "Across all subjects", icon: BarChart2 },
                    { label: "Avg Attendance", value: `${avgAtt}%`, sub: "Below 75% = alert", icon: TrendingUp },
                    { label: "Course Completion", value: "62%", sub: "Syllabus covered", icon: Award },
                ].map(c => (
                    <div key={c.label} style={{ ...CARD, display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: V.accentSoft, border: `1px solid ${V.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <c.icon size={22} color={V.accent} />
                        </div>
                        <div>
                            <div style={{ fontFamily: FONT_H, fontSize: "1.5rem", fontWeight: 900, color: V.text, lineHeight: 1 }}>{c.value}</div>
                            <div style={{ fontSize: "0.78rem", color: V.dim, marginTop: 4, fontWeight: 600 }}>{c.label}</div>
                            <div style={{ fontSize: "0.7rem", color: V.muted, marginTop: 2 }}>{c.sub}</div>
                        </div>
                    </div>
                ))}
            </div>


            {/* ─── 3. STUDENT TABLE ───────────────────────────────── */}
            <div style={CARD}>
                <SectionTitle icon={Users} label="Class Student List — CSE Year 2" sub="Click any student name to open individual analytics" />

                {/* Toolbar */}
                <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, background: V.searchBg, borderRadius: 10, padding: "0 14px", border: `1px solid ${V.border}`, transition: "border-color 0.2s, background 0.3s" }}>
                        <Search size={15} color={V.muted} />
                        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or roll…"
                            style={{ background: "none", border: "none", color: V.text, outline: "none", padding: "11px 0", width: "100%", fontSize: "0.88rem", fontFamily: "inherit" }} />
                    </div>
                    {["All", "Low", "Medium", "High"].map(r => (
                        <button key={r} onClick={() => setRiskFilter(r)} style={{
                            padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: "0.82rem", fontWeight: 700,
                            border: `1px solid ${riskFilter === r ? V.accentBorder : V.border}`,
                            background: riskFilter === r ? V.accentSoft : V.hover,
                            color: riskFilter === r ? V.accent : V.dim,
                            transition: "all 0.15s",
                        }}>
                            <Filter size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />{r}
                        </button>
                    ))}
                    <button onClick={exportReport} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, background: V.accentSoft, border: `1px solid ${V.accentBorder}`, color: V.accent, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", transition: "background 0.2s" }}>
                        <Download size={14} /> Export
                    </button>
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                                {([
                                    { l: "Student", k: "name" },
                                    { l: "Roll No", k: "roll" },
                                    { l: "Performance", k: "performance" },
                                    { l: "Attendance", k: "attendance" },
                                    { l: "Risk Level", k: "risk" },
                                    { l: "Skill Gaps", k: null },
                                    { l: "", k: null },
                                ] as { l: string; k: SortKey | null }[]).map(col => (
                                    <th key={col.l} onClick={() => col.k && toggleSort(col.k)} style={{
                                        textAlign: "left", padding: "11px 14px", color: V.muted, fontWeight: 700,
                                        fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.07em",
                                        cursor: col.k ? "pointer" : "default", whiteSpace: "nowrap",
                                    }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            {col.l}{col.k && <SortIcon k={col.k} />}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, i) => {
                                const rc = RISK_CFG[s.risk];
                                return (
                                    <tr key={s.id} style={{ borderBottom: `1px solid ${V.border}`, background: i % 2 ? V.hover : "transparent", transition: "background 0.2s" }}>
                                        <td style={{ padding: "13px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: "50%", background: s.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>
                                                    {s.avatar}
                                                </div>
                                                <div>
                                                    <span
                                                        onClick={() => { setSelectedStudent(s); setIsViewOnly(true); setShowModal(true); }}
                                                        style={{ color: V.text, fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}
                                                    >
                                                        {s.name}
                                                    </span>
                                                    <div style={{ fontSize: "0.72rem", color: V.dim }}>{s.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: "13px 14px", color: V.dim, fontWeight: 600 }}>{s.roll}</td>
                                        <td style={{ padding: "13px 14px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <div style={{ width: 80, height: 5, background: V.hover, borderRadius: 3, overflow: "hidden" }}>
                                                    <div style={{ width: `${s.performance}%`, height: "100%", borderRadius: 3, background: s.performance >= 75 ? "#10b981" : s.performance >= 55 ? "#f59e0b" : "#ef4444" }} />
                                                </div>
                                                <span style={{ fontWeight: 700, color: s.performance >= 75 ? "#10b981" : s.performance >= 55 ? "#f59e0b" : "#ef4444" }}>{s.performance}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: "13px 14px" }}>
                                            <span style={{ fontWeight: 700, color: s.attendance >= 75 ? V.dim : "#ef4444" }}>{s.attendance}%</span>
                                            {s.attendance < 75 && <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>⚠ LOW</span>}
                                        </td>
                                        <td style={{ padding: "13px 14px" }}>
                                            <span style={{ background: rc.bg, color: rc.color, padding: "4px 11px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 800 }}>
                                                ● {s.risk}
                                            </span>
                                        </td>
                                        <td style={{ padding: "13px 14px", maxWidth: 180 }}>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                                {s.skillGaps.slice(0, 2).map((g: string) => (
                                                    <span key={g} style={{ background: V.accentSoft, border: `1px solid ${V.accentBorder}`, color: V.accent, padding: "2px 8px", borderRadius: 5, fontSize: "0.7rem", fontWeight: 700 }}>{g}</span>
                                                ))}
                                                {s.skillGaps.length > 2 && <span style={{ color: V.muted, fontSize: "0.7rem" }}>+{s.skillGaps.length - 2}</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: "13px 14px", display: "flex", gap: "8px" }}>
                                            <button
                                                onClick={() => { setSelectedStudent(s); setIsViewOnly(true); setShowModal(true); }}
                                                style={{ background: V.hover, border: `1px solid ${V.border}`, color: V.text, padding: "6px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => { setSelectedStudent(s); setIsViewOnly(false); setShowModal(true); }}
                                                style={{ background: V.accentSoft, border: `1px solid ${V.accentBorder}`, color: V.accent, padding: "6px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                                            >
                                                Edit Marks
                                            </button>
                                            <button
                                                onClick={() => handleUpdateAttendance(s)}
                                                style={{ background: "transparent", border: `1px solid ${V.border}`, color: V.dim, padding: "6px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.2s, border-color 0.2s" }}
                                                onMouseOver={(e) => { e.currentTarget.style.color = V.text; e.currentTarget.style.borderColor = V.text; }}
                                                onMouseOut={(e) => { e.currentTarget.style.color = V.dim; e.currentTarget.style.borderColor = V.border; }}
                                            >
                                                Attendance
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: V.muted }}>No students found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>





            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>

            {showModal && <StudentDetailsModal onClose={() => { setShowModal(false); setSelectedStudent(null); setIsViewOnly(false); }} onSave={handleSaveStudentDetails} readOnly={isViewOnly} studentName={selectedStudent?.name} studentEmail={selectedStudent?.email} />}
        </div>
    );
}
