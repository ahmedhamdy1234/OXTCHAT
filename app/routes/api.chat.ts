import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

type FrontendMessage = {
  id?: string; // ID is optional for history, not needed for API
  text: string;
  sender: "user" | "ai";
  timestamp?: string; // Timestamp is optional for history
  edited?: boolean;
};

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ message: "Method Not Allowed" }, 405);
  }

  const { message, history } = await request.json(); // Receive current message and history

  if (!message) {
    return json({ message: "Message is required" }, 400);
  }

  const AI_API_KEY = process.env.AI_API_KEY;

  // Log API key for debugging
  console.log("DEBUG: AI_API_KEY (first 5 chars from process.env):", AI_API_KEY ? AI_API_KEY.substring(0, 5) + "..." : "Not set");

  if (!AI_API_KEY) {
    console.error("AI_API_KEY is not set in environment variables.");
    return json({ message: "AI API key not configured on the server." }, 500);
  }

  // --- Start: AI Name Logic ---
  // Check only the *current* message for name queries
  const lowerCaseMessage = message.toLowerCase();
  const nameQueries = [
    "what is your name",
    "what's your name",
    "who are you",
    "your name",
    "do you have a name",
    "what do i call you",
    "cual es tu nombre", // Spanish
    "como te llamas",    // Spanish
    "quel est ton nom",  // French
    "comment t'appelles-tu", // French
    "wie heißt du",      // German
    "dein name",         // German
    "qual é o seu nome", // Portuguese
    "come ti chiami",    // Italian
    "il tuo nome",       // Italian
    "あなたの名前は",    // Japanese
    "너의 이름은 무엇이니", // Korean
    "你叫什么名字",      // Chinese (Mandarin)
    "你個名係乜",        // Chinese (Cantonese)
    "как тебя зовут",    // Russian
    "ما اسمك",           // Arabic
    "اسمك اي",           // Arabic (informal)
    "من أنت",            // Arabic (Who are you?)
    "شو اسمك",           // Arabic (Levantine informal)
    "ايش اسمك",          // Arabic (Gulf informal)
    "هل لديك اسم",       // Arabic (Do you have a name?)
    "بماذا أناديك",      // Arabic (What should I call you?)
    "ماذا تدعى",         // Arabic (What are you called?)
    "adın ne",           // Turkish
    "आपका नाम क्या है", // Hindi
  ];

  const isAskingName = nameQueries.some(query => lowerCaseMessage.includes(query));

  if (isAskingName) {
    // Combined response as requested: "I am a large language model, trained by OXT. My name is OXT."
    return json({ response: "I am a large language model, trained by OXT. My name is OXT." });
  }
  // --- End: AI Name Logic ---

  // Prepare conversation history for the AI model
  const conversationContents = history.map((msg: FrontendMessage) => ({
    role: msg.sender === "user" ? "user" : "model", // Map 'ai' to 'model' role
    parts: [{ text: msg.text }],
  }));

  // Add the current user message to the conversation
  conversationContents.push({
    role: "user",
    parts: [{ text: message }],
  });

  // Use the full endpoint URL directly as requested
  const AI_FULL_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${AI_API_KEY}`;

  try {
    const response = await fetch(AI_FULL_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: conversationContents // Send the full conversation history
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("AI API error:", errorData);
      // Extract a more specific error message if available from the AI API response
      const errorMessage = errorData.error?.message || "Failed to get response from AI API";
      return json({ message: errorMessage, error: errorData }, response.status);
    }

    const data = await response.json();
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI.";

    return json({ response: aiResponseText });
  } catch (error) {
    console.error("Backend API error:", error);
    return json({ message: "Internal server error", error: error.message }, 500);
  }
}
