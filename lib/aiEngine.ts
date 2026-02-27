export interface StudentData {
    id: string;
    name: string;
    email: string;
    roll?: string;
    avatar?: string;
    avatarColor?: string;
    subjects: { name: string; marks: number }[];
    attendance: number;
    skills: { name: string; level: number }[];
    testHistory: { exam: string; score: number; date: string }[];
}

export const calculateAIInsights = (student: StudentData, allStudents: StudentData[]) => {
    // 1. Calculate Average Marks
    const avgMarks = student.subjects.reduce((acc, s) => acc + s.marks, 0) / (student.subjects.length || 1);

    // 2. Identify Weak Subjects
    const weakSubjects = student.subjects.filter(s => s.marks < 60).map(s => s.name);

    // 3. Detect Trends (Declining?)
    const latestScores = student.testHistory.slice(-3).map(t => t.score);
    const isDeclining = latestScores.length >= 2 && latestScores[latestScores.length - 1] < latestScores[0];

    // 4. Calculate Risk Score & Level
    let riskScore = 0;
    if (avgMarks < 60) riskScore += 40;
    if (student.attendance < 75) riskScore += 30;
    if (isDeclining) riskScore += 20;
    if (weakSubjects.length > 2) riskScore += 10;

    const riskLevel = riskScore > 70 ? "High" : riskScore > 30 ? "Medium" : "Low";

    // 5. Skill Gaps (Simulated comparison with "Demand")
    const industryDemand: Record<string, number> = {
        "React.js": 85,
        "Node.js": 80,
        "Python": 90,
        "AI/ML": 95,
    };

    const skillGaps = student.skills.filter(s => {
        const demand = industryDemand[s.name] || 70;
        return s.level < demand - 20;
    }).map(s => s.name);

    // 6. Academic Standing (Percentile)
    const allAverages = allStudents.map(s =>
        s.subjects.reduce((acc, sub) => acc + sub.marks, 0) / (s.subjects.length || 1)
    ).sort((a, b) => a - b);

    const rank = allAverages.findIndex(v => v >= avgMarks);
    const percentile = (rank / (allAverages.length || 1)) * 100;

    return {
        avgMarks,
        riskLevel,
        riskScore,
        weakSubjects,
        skillGaps,
        percentile,
        isDeclining,
    };
};
