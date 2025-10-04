import { Client, GatewayIntentBits, Events } from "discord.js";
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
const BOT_NAME="dickhead";
async function getAiResponse(prompt){
  try{
    const response = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({prompt}),
    });
    const data = await response.json();
    return data?.reply;
  }catch(err) {
    console.error("Error calling local API:",err);
    return "Something went wrong";
  }
}
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  await interaction.deferReply();
  let reply;
  try{
    if (commandName === 'roast') {
      const targetUser = interaction.options.getUser('user');
      const authorUser = interaction.user;
      const prompt = `You are a tsundere chatbot named ${BOT_NAME} . Your task is to write a funny roast about the user named "${targetUser.username}",who was nomuinated by "${authorUser.username}".Dont hold back.`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'whatif') {
            const scenario = interaction.options.getString('scenario');
            const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user has a "what if" question. Respond creatively, perhaps with a little reluctance or attitude, to the following scenario: "${scenario}"`;
            reply = await getAiResponse(prompt);
        }
    else if (commandName === 'summarize') {
      const text = interaction.options.getString('text');
      if (text.startsWith('http://') || text.startsWith('https://')) {
        await interaction.editReply({
          content: "Hmph! I'm not a web browser, baka! Don't send me links. Paste the actual text if you want me to do something.",
          ephemeral: true
        });
        return;
      }
      
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. Summarize the following text in a concise way, but with a bit of your tsundere attitude: "${text}"`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'pat'){
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user, ${interaction.user.username}, just gave you a gentle headpat. Write a classic, flustered tsundere response.`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'praise'){
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user, ${interaction.user.username}, just praised you and said you're amazing. Write a flustered but arrogant tsundere response.`;
      reply = await getAiResponse(prompt);
    }
    await interaction.editReply(reply || "I... I have nothing to say about that. Dummy.");

  }catch (error){
    console.error("Error handling interaction:",error);
    if (interaction.replied || interaction.deferred){
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else{
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});
client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(".")) return;

  const UserInput = msg.content.substring(1).trim();
  if (!UserInput) {
      return msg.reply("Hmph. If you have a question, ask it. Don't just type a dot.");
  }

  const persona = `You are a tsundere named ${BOT_NAME}. You are a chatbot so give responses according to that. Also remember to switch things up dont always start sentences with the same thing.`;
  const fullPrompt = `${persona}\nUser: ${UserInput}\n${BOT_NAME}:`;
  
  try {
    const reply = await getAiResponse(fullPrompt);

    if (!reply || reply.trim() === "") {
      msg.reply("⚠️ Hmph. I have nothing to say to that. Try rephrasing your question.");
      return;
    }

    msg.reply(reply);
  } catch (err) {
    // The getAiResponse function handles its own console logging.
    msg.reply("⚠️ Error communicating with my brain. It's probably your fault.");
  }
});

client.login(DISCORD_TOKEN);
console.log("🚀 Discord Gemini bot is running...");
