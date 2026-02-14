
import { GoogleGenAI, Type } from "@google/genai";
import { Quiz, QuestionType } from "../types";

export const generateQuizFromPDF = async (
  pdfBase64: string, 
  numQuestions: number = 40,
  previouslyCoveredTopics: string[] = []
): Promise<Quiz> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const isFollowUp = previouslyCoveredTopics.length > 0;
  
  const prompt = `Analyze this PDF document and create a professional mock exam with exactly ${numQuestions} Multiple Choice Questions. 
  
  ${isFollowUp ? `IMPORTANT: I have already studied the following topics: ${previouslyCoveredTopics.join(', ')}. 
  Please FOCUS ENTIRELY ON THE REMAINING PORTIONS of the document that have not been tested yet. DO NOT repeat questions or topics already covered.` : ''}
  
  Each question MUST have exactly 4 options. 
  For each question, provide:
  1. The question text.
  2. Four distinct options.
  3. The correct answer.
  4. A detailed explanation.
  5. A helpful "AI Hint".
  
  In the metadata, estimate what percentage of the TOTAL document this specific set of 40 questions covers (as coveragePercentage), and list the specific concepts tested (as topicsCovered).
  
  Format the output strictly as JSON. Ensure the content is academic and challenging.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          metadata: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              coveragePercentage: { type: Type.NUMBER },
              topicsCovered: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["topic", "difficulty", "coveragePercentage", "topicsCovered"],
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                type: { type: Type.STRING, enum: [QuestionType.MULTIPLE_CHOICE] },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswer: { type: Type.STRING },
                explanation: { type: Type.STRING },
                hint: { type: Type.STRING }
              },
              required: ["id", "type", "question", "options", "correctAnswer", "explanation", "hint"],
            },
          },
        },
        required: ["title", "subtitle", "questions", "metadata"],
      },
    },
  });

  if (!response.text) {
    throw new Error("No response from AI model");
  }

  return JSON.parse(response.text) as Quiz;
};
