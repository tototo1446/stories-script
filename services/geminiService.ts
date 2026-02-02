
import { GoogleGenAI, Type } from "@google/genai";
import { BrandInfo, CompetitorPattern, StorySlide } from "../types";

// Always initialize with the named parameter 'apiKey' using process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeCompetitorImages = async (
  images: string[], // base64 strings
  competitorName: string
): Promise<CompetitorPattern> => {
  const model = 'gemini-3-flash-preview';
  
  const imageParts = images.map(img => ({
    inlineData: {
      data: img.split(',')[1],
      mimeType: 'image/jpeg'
    }
  }));

  // Correct the contents structure to use an object with a 'parts' array.
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        ...imageParts,
        { text: `Analyze these ${images.length} Instagram Story screenshots from competitor "${competitorName}". 
        Extract the "skeleton" pattern of the storytelling. For each image, identify its marketing purpose (e.g., Hook, Empathy, Comparison, Solution, CTA) and visual style.
        Return a structured JSON describing this pattern.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                order: { type: Type.NUMBER },
                purpose: { type: Type.STRING },
                visualGuidance: { type: Type.STRING }
              }
            }
          }
        },
        required: ["name", "description", "slides"]
      }
    }
  });

  // Access the text property directly (not a method).
  const pattern = JSON.parse(response.text);
  return { ...pattern, id: Date.now().toString() };
};

export const generateStoryScript = async (
  brandInfo: BrandInfo,
  pattern: CompetitorPattern,
  dailyTopic: string,
  vibe: string
): Promise<StorySlide[]> => {
  const model = 'gemini-3-pro-preview'; // Use pro for better logic matching

  const prompt = `
    You are an expert Instagram Marketing Strategist. 
    Generate a ${pattern.slides.length}-slide Instagram Story script.
    
    BRAND CONTEXT:
    - Product: ${brandInfo.name} - ${brandInfo.productDescription}
    - Target: ${brandInfo.targetAudience}
    - Tone: ${brandInfo.brandTone}
    
    STRATEGIC PATTERN TO FOLLOW:
    ${JSON.stringify(pattern.slides)}
    
    TODAY'S TOPIC/CONTENT:
    ${dailyTopic}
    
    REQUESTED VIBE:
    ${vibe}
    
    Requirements:
    - Use the pattern's slide structure strictly.
    - Provide specific visual instructions (background, text placement).
    - Provide the exact script text in Japanese.
    - Add a marketing tip for each slide.
    - Include legal filtering (avoid absolute expressions like "definitely cures" - use softer marketing language).
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.NUMBER },
            role: { type: Type.STRING },
            visualGuidance: { type: Type.STRING },
            script: { type: Type.STRING },
            tips: { type: Type.STRING }
          }
        }
      }
    }
  });

  // Access the text property directly (not a method).
  return JSON.parse(response.text);
};
