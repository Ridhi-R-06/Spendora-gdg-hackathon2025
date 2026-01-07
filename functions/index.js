const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// 🔒 SECURE: Your API Key lives here, safe on the server.
const GEN_AI_KEY = "AIzaSyDbPqhaW2QWjkxBrPri2fcioJ6dM6jV4i4"; // Replace with your real key
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemma-2-9b-it" });

// WORKER 1: Parse "Lunch 200" -> JSON
exports.parseExpense = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
    
    const text = data.text;
    const defaultCat = data.defaultCat || "General";

    try {
        const prompt = `Extract JSON {item, amount, category} from "${text}". Default category: ${defaultCat}. Return JSON Only.`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean the JSON (remove backticks)
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("AI Error:", error);
        throw new functions.https.HttpsError('internal', 'AI Parsing Failed');
    }
});

// WORKER 2: Generate Budget Plan
exports.generateBudgetPlan = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');

    const { balance, days } = data;

    try {
        const prompt = `I have ₹${balance} for ${days} days. Suggest a budget breakdown for {food, bills, transport, shopping}. Return JSON Only.`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        throw new functions.https.HttpsError('internal', 'AI Planning Failed');
    }
});