"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Users, AlertTriangle, TrendingUp, Award, BookOpen,
    Search, ChevronUp, ChevronDown, Download,
    Upload, Clock, Brain, BarChart2, Filter,
    CheckCircle, FileText, Plus, X
} from "lucide-react";
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell
} from "recharts";

import { getMaterials, saveMaterial, type Material } from "@/lib/materialsStore";
import { getStudentsForFacultyByEmail, getAllocations } from "@/lib/allocationStore";
import StudentDetailsModal from "./StudentDetailsModal";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, writeBatch } from "firebase/firestore";

// ─── Types ───────────────────────────────────────────────────────────────────
type SortKey = "name" | "roll" | "performance" | "attendance" | "risk";

// ─── Theme-aware tokens ─────────────────────────────────────────────────────
const V = {
    card: "var(--ds-card, rgba(255,255,255,0.025))",
    border: "var(--ds-border, rgba(255,255,255,0.06))",
    text: "var(--ds-text, #fff)",
    dim: "var(--ds-text-dim, #6b6b6b)",
    muted: "var(--ds-text-muted, #3a3a3a)",
    accent: "var(--ds-accent, #d4ff00)",
    accentSoft: "var(--ds-accent-soft, rgba(212,255,0,0.06))",
    accentBorder: "var(--ds-accent-border, rgba(212,255,0,0.12))",
    hover: "var(--ds-hover, rgba(255,255,255,0.04))",
    surface: "var(--ds-surface, #111)",
    searchBg: "var(--ds-search-bg, #111)",
};
const FONT_H = "var(--font-display, 'Outfit', sans-serif)";

// ─── Constants ───────────────────────────────────────────────────────────────
const RISK_CFG: Record<string, { color: string; bg: string }> = {
    Low: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    High: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

const CLASSES = ["CSE-A (Year 2)", "CSE-B (Year 2)", "CSE-A (Year 3)", "All Classes"];

const CLASS_TREND = [
    { week: "Week 1", avg: 63, high: 82, low: 41 },
    { week: "Week 2", avg: 65, high: 84, low: 43 },
    { week: "Week 3", avg: 67, high: 85, low: 40 },
    { week: "Week 4", avg: 69, high: 88, low: 42 },
    { week: "Week 5", avg: 70, high: 90, low: 41 },
    { week: "Week 6", avg: 70, high: 94, low: 41 },
];

const SUBJECT_AVG = [
    { subject: "Math", avg: 70, classTarget: 75 },
    { subject: "DS", avg: 68, classTarget: 75 },
    { subject: "DBMS", avg: 73, classTarget: 75 },
    { subject: "Networks", avg: 63, classTarget: 75 },
    { subject: "OS", avg: 68, classTarget: 75 },
];

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
    const [assignedIds, setAssignedIds] = useState<string[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "students"), (snap) => {
            const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDbStudents(students);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const load = () => {
            const ids = teacherEmail
                ? getStudentsForFacultyByEmail(teacherEmail)
                : dbStudents.map((s: any) => s.id);
            setAssignedIds(ids);
        };
        load();
    }, [teacherEmail, dbStudents]);

    const MY_STUDENTS = dbStudents
        .filter((s: any) => {
            const isAssignedToMe = assignedIds.includes(s.id);
            const currentAllocations = getAllocations();
            const allAssignedIds = currentAllocations.flatMap((a: any) => a.studentIds);
            const isUnassigned = !allAssignedIds.includes(s.id);
            return isAssignedToMe || isUnassigned;
        })
        .map((s: any) => {
            const avg = s.subjects.reduce((a: any, b: any) => a + (b.marks || 0), 0) / (s.subjects.length || 1);
            return {
                ...s,
                roll: s.roll || "CSE000",
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
    const [query, setQuery] = useState("");
    const [riskFilter, setRiskFilter] = useState("All");
    const [sortKey, setSortKey] = useState<SortKey>("roll");
    const [sortAsc, setSortAsc] = useState(true);

    const filtered = MY_STUDENTS
        .filter(s =>
            (riskFilter === "All" || s.risk === riskFilter) &&
            (s.name.toLowerCase().includes(query.toLowerCase()) ||
                s.roll.toLowerCase().includes(query.toLowerCase()))
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
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const handleSaveStudentDetails = (data: any) => {
        if (selectedStudent) {
            localStorage.setItem(`skillsync-student-data-${selectedStudent.email}`, JSON.stringify(data));
            alert(`Marks for ${selectedStudent.name} updated successfully!`);
        }
    };

    const handleBulkAttendance = async () => {
        const val = prompt("Enter attendance percentage for all students (0-100):");
        if (val === null) return;
        const att = parseInt(val);
        if (isNaN(att) || att < 0 || att > 100) {
            alert("Please enter a valid percentage between 0 and 100.");
            return;
        }

        const batch = writeBatch(db);
        MY_STUDENTS.forEach(student => {
            const studentRef = doc(db, "students", student.email);
            batch.update(studentRef, { attendance: att });
        });

        try {
            await batch.commit();
            alert(`Attendance set to ${att}% for all ${MY_STUDENTS.length} students in real-time.`);
        } catch (e) {
            console.error("Bulk update failed:", e);
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
                            Faculty Dashboard — AI Class Management
                        </span>
                    </div>
                    <h1 style={{ fontFamily: FONT_H, fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-0.03em", color: V.text, margin: 0 }}>
                        Welcome, <span className="text-gradient">{teacherName}</span>
                    </h1>
                    <p style={{ color: V.dim, marginTop: 6, fontSize: "0.9rem" }}>
                        CSE Year 2 — Class analytics updated at 01:01 IST · AI risk analysis active
                    </p>
                </div>
                <button onClick={handleBulkAttendance} style={{
                    background: V.accentSoft, border: `1px solid ${V.accentBorder}`, color: V.accent,
                    padding: "8px 16px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: "8px", cursor: "pointer",
                    transition: "0.2s", height: "fit-content"
                }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(212,255,0,0.12)"} onMouseOut={(e) => e.currentTarget.style.background = V.accentSoft}>
                    <Clock size={16} /> Bulk Attendance Update
                </button>
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

            {/* ─── 2. CLASS PERFORMANCE ANALYTICS ────────────────── */}
            <div>
                <SectionTitle icon={BarChart2} label="Class Performance Analytics" sub="AI-tracked weekly trends and subject distribution" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 20 }}>

                    {/* Line chart — Class trend */}
                    <div style={CARD}>
                        <h3 style={{ fontFamily: FONT_H, margin: "0 0 4px", fontWeight: 800, color: V.text, fontSize: "0.95rem" }}>📈 Weekly Class Performance Trend</h3>
                        <p style={{ margin: "0 0 18px", fontSize: "0.78rem", color: V.dim }}>Average, highest and lowest student score per week</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={CLASS_TREND} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="week" tick={{ fill: V.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[30, 100]} tick={{ fill: V.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip {...TT} />
                                <Legend wrapperStyle={{ fontSize: "0.75rem", color: V.dim }} />
                                <Line type="monotone" dataKey="avg" name="Class Avg" stroke="#d4ff00" strokeWidth={2.5} dot={{ r: 3, fill: "#d4ff00" }} />
                                <Line type="monotone" dataKey="high" name="Top Score" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                                <Line type="monotone" dataKey="low" name="Bottom Score" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bar chart — Subject averages */}
                    <div style={CARD}>
                        <h3 style={{ fontFamily: FONT_H, margin: "0 0 4px", fontWeight: 800, color: V.text, fontSize: "0.95rem" }}>📊 Subject-wise Class Average</h3>
                        <p style={{ margin: "0 0 18px", fontSize: "0.78rem", color: V.dim }}>Average marks vs target (75%) per subject</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={SUBJECT_AVG} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="subject" tick={{ fill: V.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fill: V.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip {...TT} />
                                <Legend wrapperStyle={{ fontSize: "0.75rem", color: V.dim }} />
                                <Bar dataKey="avg" name="Class Avg" fill="#d4ff00" radius={[5, 5, 0, 0]} barSize={20} />
                                <Bar dataKey="classTarget" name="Target" fill="rgba(255,255,255,0.06)" radius={[5, 5, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pie chart — Risk distribution */}
                    <div style={CARD}>
                        <h3 style={{ fontFamily: FONT_H, margin: "0 0 4px", fontWeight: 800, color: V.text, fontSize: "0.95rem" }}>🎯 Risk Distribution</h3>
                        <p style={{ margin: "0 0 14px", fontSize: "0.78rem", color: V.dim }}>Student risk level breakdown</p>
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie data={riskPie} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                                    {riskPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip {...TT} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                            {riskPie.map(r => (
                                <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, display: "inline-block" }} />
                                        <span style={{ fontSize: "0.8rem", color: V.dim }}>{r.name}</span>
                                    </div>
                                    <span style={{ fontWeight: 800, color: r.color, fontSize: "0.9rem" }}>{r.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── 3. STUDENT TABLE ───────────────────────────────── */}
            <div style={CARD}>
                <SectionTitle icon={Users} label="Class Student List — CSE Year 2" sub="Click any student name to open individual analytics" />

                {/* Toolbar */}
                <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 10, background: V.searchBg, borderRadius: 10, padding: "0 14px", border: `1px solid ${V.border}`, transition: "border-color 0.2s, background 0.3s" }}>
                        <Search size={15} color={V.muted} />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or roll…"
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
                                                    <Link href={`/dashboard/faculty/student/${s.id}`} style={{ color: V.text, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}>
                                                        {s.name}
                                                    </Link>
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
                                            <Link href={`/dashboard/faculty/student/${s.id}`} style={{ background: V.hover, border: `1px solid ${V.border}`, color: V.text, padding: "6px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}>
                                                View
                                            </Link>
                                            <button
                                                onClick={() => { setSelectedStudent(s); setShowModal(true); }}
                                                style={{ background: V.accentSoft, border: `1px solid ${V.accentBorder}`, color: V.accent, padding: "6px 13px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                                            >
                                                Edit Marks
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

            {/* ─── 4. AI INSIGHTS ROW ─────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* At-risk alerts */}
                <div style={CARD}>
                    <SectionTitle icon={AlertTriangle} label="Immediate Action Required" sub="Students flagged by AI as high dropout risk" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {MY_STUDENTS.filter(s => s.risk === "High" || s.risk === "Medium").map(s => {
                            const rc = RISK_CFG[s.risk];
                            return (
                                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: `${rc.color}08`, border: `1px solid ${rc.color}25`, borderRadius: 12, flexWrap: "wrap" }}>
                                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: s.avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{s.avatar}</div>
                                    <div style={{ flex: 1 }}>
                                        <Link href={`/dashboard/faculty/student/${s.id}`} style={{ fontWeight: 700, color: V.text, textDecoration: "none", fontSize: "0.9rem" }}>{s.name}</Link>
                                        <div style={{ fontSize: "0.75rem", color: V.dim }}>Performance: {s.performance}% · Attendance: {s.attendance}%</div>
                                    </div>
                                    <span style={{ background: rc.bg, color: rc.color, padding: "4px 11px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800 }}>● {s.risk}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI teaching insights */}
                <div style={CARD}>
                    <SectionTitle icon={Brain} label="AI Teaching Insights" sub="Auto-generated recommendations for your class" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {[
                            { tag: "Alert", text: "Networks subject average (63%) is below target. Consider a revision session on OSI Model & TCP/IP." },
                            { tag: "Insight", text: "3 of 6 students show upward performance trajectory — engagement strategies are working." },
                            { tag: "Action", text: "Rohan Das (CSE003) has declined 4% over 3 weeks. A one-on-one intervention is recommended." },
                            { tag: "Trend", text: "Attendance below 75% for 2 students — auto-alert sent to academic office." },
                        ].map((ins, i) => (
                            <div key={i} style={{ display: "flex", gap: 12, padding: "13px 15px", background: V.accentSoft, borderRadius: 10, border: `1px solid ${V.accentBorder}` }}>
                                <span style={{ background: V.accentBorder, color: V.accent, padding: "2px 8px", borderRadius: 5, fontSize: "0.65rem", fontWeight: 800, whiteSpace: "nowrap", alignSelf: "flex-start", marginTop: 2, fontFamily: FONT_H }}>{ins.tag}</span>
                                <p style={{ fontSize: "0.83rem", color: V.text, lineHeight: 1.55, margin: 0, opacity: 0.85 }}>{ins.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── 5. STUDY MATERIALS UPLOAD ──────────────────────── */}
            <div style={CARD}>
                <SectionTitle icon={Upload} label="Upload Study Materials" sub="Files appear instantly in Student Dashboard → Curriculum → Study Materials from Teacher" />

                {uploadOk && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 11, marginBottom: 20, color: "#10b981", fontWeight: 700, fontSize: "0.88rem" }}>
                        <CheckCircle size={17} /> Material uploaded! It now appears in the Student Curriculum page.
                    </div>
                )}
                {uploadErr && (
                    <div style={{ padding: "11px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 11, marginBottom: 16, color: "#f87171", fontSize: "0.83rem" }}>
                        {uploadErr}
                    </div>
                )}

                <form onSubmit={handleUpload}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        {/* Left fields */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {[
                                { label: "Material Title *", value: matTitle, set: setMatTitle, placeholder: "e.g., Week 4 – Network Layer Notes" },
                                { label: "Description", value: matDesc, set: setMatDesc, placeholder: "Brief summary of this material…" },
                            ].map(f => (
                                <div key={f.label}>
                                    <label style={{ fontSize: "0.75rem", fontWeight: 800, color: V.dim, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7, fontFamily: FONT_H }}>{f.label}</label>
                                    <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                                        style={{ width: "100%", background: V.hover, border: `1px solid ${V.border}`, borderRadius: 10, padding: "11px 14px", color: V.text, fontSize: "0.88rem", outline: "none", fontFamily: "inherit", transition: "border-color 0.2s" }} />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: "0.75rem", fontWeight: 800, color: V.dim, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7, fontFamily: FONT_H }}>Assign to Class</label>
                                <select value={matClass} onChange={e => setMatClass(e.target.value)}
                                    style={{ width: "100%", background: V.hover, border: `1px solid ${V.border}`, borderRadius: 10, padding: "11px 14px", color: V.text, fontSize: "0.88rem", outline: "none", fontFamily: "inherit" }}>
                                    {CLASSES.map(c => <option key={c} value={c} style={{ background: "#1a1a2e" }}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Dropzone */}
                        <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: V.dim, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7, fontFamily: FONT_H }}>Upload File * (PDF, DOC, PPT)</label>
                            <div
                                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                                onDragOver={e => e.preventDefault()}
                                onClick={() => fileRef.current?.click()}
                                style={{ border: `2px dashed ${matFile ? "#10b981" : V.border}`, borderRadius: 14, padding: "36px 16px", textAlign: "center", cursor: "pointer", background: matFile ? "rgba(16,185,129,0.04)" : V.hover, minHeight: 164, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, transition: "all 0.2s" }}
                            >
                                {matFile ? (
                                    <>
                                        <div style={{ fontSize: "2rem" }}>{extIcon[matFile.name.split(".").pop()?.toUpperCase() || ""] || "📁"}</div>
                                        <div style={{ fontWeight: 700, color: V.text, fontSize: "0.9rem" }}>{matFile.name}</div>
                                        <div style={{ fontSize: "0.75rem", color: V.dim }}>{(matFile.size / 1024).toFixed(1)} KB</div>
                                        <button type="button" onClick={e => { e.stopPropagation(); setMatFile(null); }}
                                            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#f87171", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 5 }}>
                                            <X size={11} /> Remove
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ width: 50, height: 50, borderRadius: 12, background: V.accentSoft, border: `1px solid ${V.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Upload size={22} color={V.accent} />
                                        </div>
                                        <div>
                                            <p style={{ color: V.text, fontWeight: 700, margin: "0 0 4px", fontSize: "0.9rem" }}>Drag & Drop or Click</p>
                                            <p style={{ color: V.dim, fontSize: "0.78rem", margin: 0 }}>PDF, DOC, DOCX, PPT, PPTX</p>
                                        </div>
                                    </>
                                )}
                                <input ref={(el) => { fileRef.current = el; }} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                                    style={{ display: "none" }} />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={uploading} style={{
                        marginTop: 22, padding: "13px 28px",
                        background: uploading ? V.hover : V.accent,
                        border: "none", borderRadius: 11,
                        color: uploading ? V.dim : "#0a0a0a",
                        fontWeight: 800, fontSize: "0.95rem", fontFamily: FONT_H,
                        cursor: uploading ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", gap: 10,
                        transition: "all 0.2s",
                    }}>
                        {uploading
                            ? <><span style={{ display: "inline-block", width: 17, height: 17, border: `2px solid ${V.border}`, borderTopColor: V.accent, borderRadius: "50%", animation: "spin 0.6s linear infinite" }} /> Uploading...</>
                            : <><Plus size={17} /> Upload Material</>}
                    </button>
                </form>

                {/* Uploaded list preview */}
                {materials.length > 0 && (
                    <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${V.border}` }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: V.dim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, fontFamily: FONT_H }}>
                            <FileText size={13} style={{ verticalAlign: "middle", marginRight: 6 }} />Previously Uploaded ({materials.length})
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
                            {materials.slice(0, 6).map(m => (
                                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: V.hover, border: `1px solid ${V.border}`, borderRadius: 10, transition: "background 0.2s" }}>
                                    <span style={{ fontSize: "1.5rem" }}>{extIcon[m.fileType] || "📁"}</span>
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                        <div style={{ fontWeight: 700, color: V.text, fontSize: "0.83rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title}</div>
                                        <div style={{ fontSize: "0.7rem", color: V.dim }}>{m.assignedClass} · {m.fileType}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {materials.length > 6 && (
                            <Link href="/dashboard/faculty/materials" style={{ display: "inline-block", marginTop: 12, fontSize: "0.82rem", color: V.accent, fontWeight: 700, textDecoration: "none" }}>
                                View all {materials.length} materials →
                            </Link>
                        )}
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>

            {showModal && <StudentDetailsModal onClose={() => { setShowModal(false); setSelectedStudent(null); }} onSave={handleSaveStudentDetails} readOnly={false} studentName={selectedStudent?.name} studentEmail={selectedStudent?.email} />}
        </div>
    );
}
