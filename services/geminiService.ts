import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Outfit } from "../types";

// NOTE: this key is bundled into the client build. See README "Known issues".
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AISearchItem {
  name: string;
  brand: string;
  price: string;
  link: string;
}

export interface AISearchResult {
  text: string;
  items: AISearchItem[];
  sources: { title: string; uri: string }[];
}

export interface PersonaAnalysis {
  archetype: string;
  suggestedColors: string[];
  stylePath: string; // Simple, Street, or Classy
  logic: string;
}

const FALLBACK_PERSONA: PersonaAnalysis = {
  archetype: "Modern Human",
  suggestedColors: ["Black", "White", "Grey"],
  stylePath: "Simple",
  logic: "Minimalist architecture is universally flattering."
};

/** Splits a `data:<mime>;base64,<data>` URI into the parts Gemini expects. */
const toInlineData = (imageUri: string) => ({
  data: imageUri.split(',')[1],
  mimeType: imageUri.split(';')[0].split(':')[1]
});

/** Returns the first image part of a response as a data URI, or null. */
const firstImage = (response: GenerateContentResponse): string | null => {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return null;
};

const isPersona = (value: unknown): value is PersonaAnalysis => {
  const v = value as Partial<PersonaAnalysis> | null;
  return !!v
    && typeof v.archetype === 'string'
    && typeof v.logic === 'string'
    && typeof v.stylePath === 'string'
    && Array.isArray(v.suggestedColors)
    && v.suggestedColors.every(c => typeof c === 'string');
};

export const geminiService = {
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
    const items: AISearchItem[] = [];
    const itemRegex = /ITEM_START\s*([\s\S]*?)\s*ITEM_END/g;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
      try {
        items.push(JSON.parse(match[1]) as AISearchItem);
      } catch (e) {
        console.error("Failed to parse AI item", e);
      }
    }

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map(chunk => chunk.web ? { title: chunk.web.title ?? '', uri: chunk.web.uri ?? '' } : null)
      .filter((s): s is { title: string; uri: string } => s !== null) || [];

    return {
      text: text.replace(itemRegex, "").trim(),
      items,
      sources
    };
  },

  async generateStyleMoodboard(prompt: string): Promise<string | null> {
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
    return firstImage(response);
  },

  async tryOnOutfit(imageUri: string, outfitDescription: string): Promise<string | null> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: toInlineData(imageUri) },
          { text: `Edit this photo to show the person wearing the following outfit: ${outfitDescription}. Ensure the fit is realistic and matches the person's pose and physique. Keep the background similar.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4"
        }
      }
    });
    return firstImage(response);
  },

  async analyzeUserPersona(imageUri: string): Promise<PersonaAnalysis> {
    const ai = getAI();
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
          { inlineData: toInlineData(imageUri) },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        // Without a schema the model picks its own keys and the scan screen
        // crashes on `persona.suggestedColors.map`.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            archetype: { type: Type.STRING },
            suggestedColors: { type: Type.ARRAY, items: { type: Type.STRING } },
            stylePath: { type: Type.STRING, enum: ['Simple', 'Street', 'Classy'] },
            logic: { type: Type.STRING }
          },
          required: ['archetype', 'suggestedColors', 'stylePath', 'logic']
        },
        thinkingConfig: { thinkingBudget: 16384 }
      }
    });

    try {
      const parsed: unknown = JSON.parse(response.text || '{}');
      return isPersona(parsed) ? parsed : FALLBACK_PERSONA;
    } catch {
      return FALLBACK_PERSONA;
    }
  },

  async analyzeFit(imageUri: string, outfit: Pick<Outfit, 'name'>): Promise<string | null> {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: toInlineData(imageUri) },
          { text: `Analyze fit for ${outfit.name}. Give score and 3 tips.` }
        ]
      },
      config: { thinkingConfig: { thinkingBudget: 32768 } }
    });
    return response.text ?? null;
  }
};
