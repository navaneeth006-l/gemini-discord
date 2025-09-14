import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(".")) return;

  const UserInput = msg.content.replace(".", "").trim();
  if (!UserInput) return msg.reply("Please type a question after .");

  const BOT_NAME="dickhead";
  const persona = `You are a tsundere named ${BOT_NAME}. You are a chatbot so give responses according to that. Also remember to switch things up dont always start sentences with the same thing.`;
  try {
    const response = await fetch("http://localhost:3000/chat", {
      method : "POST",
      headers : {"Content-Type" : "application/json"},
      body : JSON.stringify({
        prompt: `${persona}\nUser: ${UserInput}\nTsundere:`,
      }),
    });

    const data = await response.json();
    // Safe way to get text
    const reply = data?.reply;

    if (!reply || reply.trim() === "") {
      msg.reply("⚠️ Local returned no response. Try rephrasing your question.");
      return;
    }

    msg.reply(reply);
  } catch (err) {
    console.error("Error calling local: ", err);
    msg.reply("⚠️ Error communicating with local.");
  }
});

client.login(DISCORD_TOKEN);
console.log("🚀 Discord Gemini bot is running...");
