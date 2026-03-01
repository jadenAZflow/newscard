import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'AIzaSyD8m5QySTFnqHIvTSYQfsKKlVuLwz9BXN8' });

async function testImagen() {
    const models = [
        'imagen-3.0-generate-001',
        'imagen-3.0-generate-002',
        'imagen-4.0-generate-001',
        'imagen-3.0-fast-generate-001',
        'gemini-2.5-flash-image-preview',
        'gemini-3.1-flash-image-preview'
    ];

    for (const model of models) {
        console.log(`\n--- Testing ${model} ---`);
        try {
            // First try generateImages
            try {
                const response = await (genAI.models as any).generateImages({
                    model: model,
                    prompt: 'A red apple',
                    config: {
                        numberOfImages: 1,
                        aspectRatio: "1:1",
                    }
                });
                console.log(`✅ SUCCESS with generateImages`);
                continue;
            } catch (e1: any) {
                if (!e1.message.includes('NOT_FOUND')) {
                    console.log(`❌ FAILED generateImages with non-404 error:`, e1.message);
                } else {
                    console.log(`❌ FAILED generateImages: 404 NOT_FOUND`);
                }
            }

            // Then try generateContent
            try {
                const response = await genAI.models.generateContent({
                    model: model,
                    contents: 'Describe a red apple',
                });
                console.log(`✅ SUCCESS with generateContent`);
            } catch (e2: any) {
                if (!e2.message.includes('NOT_FOUND')) {
                    console.log(`❌ FAILED generateContent with non-404 error:`, e2.message);
                } else {
                    console.log(`❌ FAILED generateContent: 404 NOT_FOUND`);
                }
            }
        } catch (e: any) {
            console.error(`Unexpected error testing ${model}:`, e);
        }
    }
}

testImagen();
