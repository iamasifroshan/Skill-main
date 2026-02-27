import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: Request) {
    try {
        const { message, studentData } = await req.json();

        const prompt = `
            You are SkillSync AI, a smart academic assistant.
            The user is a student with the following profile:
            - Name: ${studentData.name}
            - Attendance: ${studentData.attendance}%
            - Subjects & Marks: ${JSON.stringify(studentData.subjects)}
            - Skills: ${JSON.stringify(studentData.skills)}
            - Test History: ${JSON.stringify(studentData.testHistory)}

            Guidelines:
            1. Be encouraging but honest.
            2. If grades are low (<60), suggest specific improvements.
            3. If skill gaps exist, suggest learning resources or paths.
            4. Keep responses concise and formatted for a chat bubble.
            5. Use the student's data to answer their specific questions.

            Student Question: "${message}"
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ reply: text });
    } catch (error) {
        console.error("Chat Error:", error);
        return NextResponse.json({ reply: "I'm sorry, I encountered an error processing your request." }, { status: 500 });
    }
}
