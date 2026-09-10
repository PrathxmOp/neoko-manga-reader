import { getCachedData, setCachedData } from './storage';

export interface TranslationBubble {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0..1000 scale
  originalText?: string;
  translatedText: string;
}

export interface TranslationResult {
  imageUrl: string;
  targetLanguage: string;
  bubbles: TranslationBubble[];
  timestamp: number;
}

const memoryCache = new Map<string, TranslationBubble[]>();

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.5-pro'
];

/**
 * Executes a Gemini API request with automatic model fallback
 */
async function callGeminiApi(apiKey: string, body: any): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastErrorMsg = '';

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return response;
      }

      const clone = response.clone();
      const errorData = await clone.json().catch(() => null);
      const msg = errorData?.error?.message || '';

      if (response.status === 404 || msg.includes('no longer available') || msg.includes('not found')) {
        lastResponse = response;
        lastErrorMsg = msg;
        continue;
      }

      return response;
    } catch (err: any) {
      lastErrorMsg = err?.message || 'Network error';
    }
  }

  if (lastResponse) return lastResponse;
  throw new Error(lastErrorMsg || 'Failed to connect to Gemini API');
}

/**
 * Converts image URL to base64 string and mime type
 */
async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch manga page image (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  const mimeType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({ base64, mimeType });
    };
    reader.onerror = () => reject(new Error('Failed to read image file as Base64'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Tests if a Gemini API key is valid
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'API Key is empty' };
  }

  try {
    const response = await callGeminiApi(apiKey, {
      contents: [
        {
          parts: [{ text: 'Respond with "OK" if this API key is valid.' }]
        }
      ]
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const msg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      return { success: false, message: msg };
    }

    return { success: true, message: 'Gemini API Key is valid and working!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error connecting to Gemini API' };
  }
}

export function clearTranslationCache(imageUrl?: string) {
  if (imageUrl) {
    memoryCache.forEach((_, key) => {
      if (key.includes(imageUrl)) memoryCache.delete(key);
    });
  } else {
    memoryCache.clear();
  }
}

/**
 * Translates a manga page using Gemini Vision API
 */
export async function translateMangaPage(
  imageUrl: string,
  targetLanguage: string = 'English',
  apiKey: string,
  forceRefresh: boolean = false
): Promise<TranslationBubble[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is missing. Please set your API key in Settings.');
  }

  const cacheKey = `trans_${targetLanguage}_${imageUrl}`;

  if (forceRefresh) {
    memoryCache.delete(cacheKey);
  } else {
    // Check memory cache first
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey)!;
    }

    // Check persistent storage cache
    const cached = getCachedData<TranslationBubble[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      memoryCache.set(cacheKey, cached);
      return cached;
    }
  }

  // Convert image to base64
  const { base64, mimeType } = await imageUrlToBase64(imageUrl);

  const prompt = `You are a professional manga translator. Analyze this manga/comic page and translate all text into ${targetLanguage}.
Detect speech bubbles, captions, and text boxes.
For each text box/speech bubble, detect its normalized 2D bounding box coordinates [ymin, xmin, ymax, xmax] on a scale of 0 to 1000 (where 0,0 is top-left and 1000,1000 is bottom-right). Ensure the bounding box generously encloses the entire speech bubble.
Extract the original text and translate it into clear, natural, and concise ${targetLanguage} suitable for fitting inside comic speech bubbles.

Return a JSON array of objects with the following schema:
[
  {
    "box_2d": [ymin, xmin, ymax, xmax],
    "originalText": "original text here",
    "translatedText": "translated text here"
  }
]`;

  const response = await callGeminiApi(apiKey, {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const errorMsg = errorBody?.error?.message || `API error (${response.status})`;
    throw new Error(`Gemini Translation failed: ${errorMsg}`);
  }

  const data = await response.json();
  const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error('Gemini API returned an empty response.');
  }

  let bubbles: TranslationBubble[] = [];
  try {
    const parsed = JSON.parse(textResponse);
    if (Array.isArray(parsed)) {
      bubbles = parsed.filter(b => b && Array.isArray(b.box_2d) && b.box_2d.length === 4 && b.translatedText);
    }
  } catch (err) {
    console.error('Failed to parse Gemini translation JSON response:', textResponse);
    throw new Error('Failed to parse translation response format from Gemini.');
  }

  // Cache results
  memoryCache.set(cacheKey, bubbles);
  setCachedData(cacheKey, bubbles, 60 * 24 * 30); // cache for 30 days

  return bubbles;
}
