import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedItem, SearchMode } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Generates related terms based on a source term, including explanations.
 */
export const generateRelatedNodes = async (
  sourceTerm: string,
  mode: SearchMode
): Promise<GeneratedItem[]> => {
  const isPrecise = mode === 'precise';

  const prompt = `
    Source Term: "${sourceTerm}"
    
    Task: Generate 5 related terms (child nodes) based on the Source Term.
    
    Mode: ${isPrecise ? 'PRECISE' : 'DEFAULT'}
    
    Rules:
    ${isPrecise 
      ? '- PRECISE MODE: Only provide terms that are scientifically, logically, or strictly hierarchically related. Avoid loose associations.' 
      : '- DEFAULT MODE: Provide broad associations, cultural connections, or common knowledge links.'}
    - Output must be a JSON object with a "items" array.
    - Each item must have:
      - "label": The related term (short, 1-3 words max).
      - "relation": A short verb or phrase describing the link (e.g., "eats", "is a type of", "competes with").
      - "relationType": One of "positive" (green), "negative" (red), "competitor" (orange), "hierarchical" (blue), "neutral" (gray).
      - "explanation": A concise, interesting encyclopedia-style explanation of the term (approx 100-150 words).
    - Do not duplicate the source term.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            relation: { type: Type.STRING },
            relationType: { type: Type.STRING, enum: ['positive', 'negative', 'neutral', 'competitor', 'hierarchical'] },
            explanation: { type: Type.STRING },
          },
          required: ['label', 'relation', 'relationType', 'explanation'],
        },
      },
    },
    required: ['items'],
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: isPrecise ? 0.2 : 0.7,
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return parsed.items || [];
    }
    return [];
  } catch (error) {
    console.error("Error generating nodes:", error);
    return [];
  }
};

/**
 * Generates a detailed explanation for a term (fallback or for root node).
 */
export const generateExplanation = async (term: string): Promise<string> => {
  const prompt = `
    Write a concise but interesting encyclopedia-style explanation for the term: "${term}".
    Length: 150-200 words.
    Tone: Informative and engaging.
    Return as plain text, no markdown formatting allowed in the body (or keep it very minimal).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "No explanation available.";
  } catch (error) {
    console.error("Error generating explanation:", error);
    return "Failed to generate explanation.";
  }
};
