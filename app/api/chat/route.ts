import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: Request) {
    try {
        const { message, studentData } = await req.json();

        let contextPrompt = "";
        if (studentData) {
            contextPrompt = `
                The user is a student with the following profile:
                - Name: ${studentData.name}
                - Attendance: ${studentData.attendance}%
                - Subjects & Marks: ${JSON.stringify(studentData.subjects)}
                - Skills: ${JSON.stringify(studentData.skills)}
                - Test History: ${JSON.stringify(studentData.testHistory)}
            `;
        } else {
            contextPrompt = `The user is a Faculty member or Admin overseeing the SkillSync platform. Provide general assistance regarding platform features or academic management.`;
        }

        const prompt = `
            You are SkillSync AI, a smart academic assistant.
            ${contextPrompt}

            Guidelines:
            1. Be professional and helpful.
            2. If it's a student, offer encouragement and specific study tips based on their data.
            3. If it's faculty/admin, focus on platform utility and high-level insights.
            4. Keep responses concise and formatted for a chat bubble.

            User Question: "${message}"
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
