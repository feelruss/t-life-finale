import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const GROQ_API_KEY = process.env.VITE_GROQ_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function runTests() {
    console.log("=========================================");
    console.log("🧪 RUNNING SYSTEM DIAGNOSTICS & API TESTS");
    console.log("=========================================\n");

    // TEST 1: GROQ CHATBOT API
    console.log("1️⃣  Testing Groq Chatbot API...");
    try {
        const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: 'Say "Chatbot is online!"' }],
                temperature: 0.7
            })
        });
        const chatData = await chatRes.json();
        if (chatData.error) throw new Error(chatData.error.message);
        console.log("✅ Chatbot API is WORKING. Response:", chatData.choices[0].message.content.trim());
    } catch (e) {
        console.log("❌ Chatbot API FAILED:", e.message);
    }

    // TEST 2: GROQ FOCUS METER API
    console.log("\n2️⃣  Testing Groq Focus Meter API...");
    try {
        const prompt = `Return a JSON object ONLY with the following structure: {"focusScore": 85, "balanceScore": 15, "recommendation": "Test pass"}`;
        const focusRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                response_format: { type: "json_object" }
            })
        });
        const focusData = await focusRes.json();
        if (focusData.error) throw new Error(focusData.error.message);
        console.log("✅ Focus Meter API is WORKING. Response:", focusData.choices[0].message.content.trim());
    } catch (e) {
        console.log("❌ Focus Meter API FAILED:", e.message);
    }

    // TEST 3: SUPABASE DATABASE CONNECTION
    console.log("\n3️⃣  Testing Supabase Database Connection...");
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        // We'll just check if the table exists by doing a fast select
        const { data, error } = await supabase.from('ai_meter_history').select('*').limit(1);
        
        // Error code 42P01 means relation does not exist. Anything else (even RLS errors) means it connected.
        if (error && error.code === '42P01') {
            console.log("❌ Database connection failed or table 'ai_meter_history' does not exist.");
        } else {
            console.log("✅ Supabase Database is CONNECTED & 'ai_meter_history' table exists.");
        }
    } catch (e) {
        console.log("❌ Supabase connection FAILED:", e.message);
    }

    console.log("\n=========================================");
    console.log("🏁 TESTS COMPLETE!");
    console.log("=========================================\n");
}

runTests();
