
import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AISearchResult {
  text: string;
  items: { name: string; brand: string; price: string; link: string }[];
  sources: { title: string; uri: string }[];
}

export interface PersonaAnalysis {
  archetype: string;
  suggestedColors: string[];
  stylePath: string; // Simple, Street, or Classy
  logic: string;
}

export const geminiService = {
  async getOutfitAdvice(outfitName: string, budget: number) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: `Explain in 2 short sentences why the outfit "${outfitName}" is a great choice for a budget of ${budget} euros. Keep it punchy and cool.`,
    });
    return response.text;
  },

  async getStyleIdeation(prompt: string): Promise<AISearchResult> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The user wants to dress in this style: "${prompt}". 
      You are 'AL', a world-class avant-garde style architect. 
      Use Google Search to find current 2024/2025 fashion trends and ACTUAL affordable products (Zara, H&M, Uniqlo, ASOS, Amazon).
      
      1. Give this style a high-fashion "Fit Name".
      2. Summarize the "Vibe" in one sharp sentence.
      3. Identify 4 specific items available for purchase right now.
      
      You MUST provide the item details in this EXACT format at the end of your response:
      ITEM_START
      {"name": "Item Name", "brand": "Brand", "price": "Approx Price in €", "link": "Search Query Link"}
      ITEM_END
      (Repeat 4 times)
      
      The link should be a Google Shopping search URL for that item.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    const items: any[] = [];
    const itemRegex = /ITEM_START\s*([\s\S]*?)\s*ITEM_END/g;
    let match;
    
    while ((match = itemRegex.exec(text)) !== null) {
      try {
        items.push(JSON.parse(match[1]));
      } catch (e) {
        console.error("Failed to parse AI item", e);
      }
    }

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
      .filter((s): s is { title: string; uri: string } => s !== null) || [];

    return {
      text: text.replace(itemRegex, "").trim(),
      items,
      sources
    };
  },

  async generateStyleMoodboard(prompt: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A high-quality fashion moodboard and outfit flat-lay for the following style: ${prompt}. Professional studio lighting, aesthetic composition, realistic clothing textures.` }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  },

  async tryOnOutfit(imageUri: string, outfitDescription: string): Promise<string | null> {
    const ai = getAI();
    const base64Data = imageUri.split(',')[1];
    const mimeType = imageUri.split(';')[0].split(':')[1];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `Edit this photo to show the person wearing the following outfit: ${outfitDescription}. Ensure the fit is realistic and matches the person's pose and physique. Keep the background similar.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  },

  async analyzeUserPersona(imageUri: string): Promise<PersonaAnalysis> {
    const ai = getAI();
    const base64Data = imageUri.split(',')[1];
    const mimeType = imageUri.split(';')[0].split(':')[1];

    const prompt = `
      You are 'AL', the Style Architect. Analyze this person's physical archetype and current style.
      Identify:
      1. Physical Archetype.
      2. Suggested Color Palette (3 colors).
      3. Style Path: 'Simple', 'Street', or 'Classy'.
      4. Logic.
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16384 }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      return {
        archetype: "Modern Human",
        suggestedColors: ["Black", "White", "Grey"],
        stylePath: "Simple",
        logic: "Minimalist architecture is universally flattering."
      };
    }
  },

  async analyzeFit(imageUri: string, outfit: any) {
    const ai = getAI();
    const base64Data = imageUri.split(',')[1];
    const mimeType = imageUri.split(';')[0].split(':')[1];

    const prompt = `Analyze fit for ${outfit.name}. Give score and 3 tips.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: { thinkingConfig: { thinkingBudget: 32768 } }
    });
    return response.text;
  }
};
