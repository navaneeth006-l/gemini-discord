import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API = process.env.GEMINI_API;
const MODEL_NAME = process.env.MODEL_NAME;

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Gemini SDK
const genAI = new GoogleGenerativeAI(GEMINI_API);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith("!ask")) return;

  const userInput = msg.content.replace("!ask", "").trim();
  if (!userInput) return msg.reply("Please type a question after !ask.");

  try {
    const result = await model.generateContent(userInput);

    // Safe way to get text
    const reply = result?.response?.text?.();

    if (!reply || reply.trim() === "") {
      msg.reply("⚠️ Gemini returned no response. Try rephrasing your question.");
      return;
    }

    msg.reply(reply);
  } catch (err) {
    console.error("Error calling Gemini:", err);
    msg.reply("⚠️ Error communicating with Gemini.");
  }
});

client.login(DISCORD_TOKEN);
console.log("🚀 Discord Gemini bot is running...");
