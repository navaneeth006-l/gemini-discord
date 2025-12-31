import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus, getVoiceConnection} from '@discordjs/voice';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from "url";

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_API = process.env.GEMINI_API;
const MODEL_NAME = process.env.MODEL_NAME;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
const BOT_NAME="dickhead";
const serverStates = new Map();
const genAI = new GoogleGenerativeAI(GEMINI_API);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });
async function getAiResponse(prompt){
  try{
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    return text;
  }catch(err) {
    console.error("Error calling Gemini API:",err);
    return "Something went wrong";
  }
}
function getRandomFile(files) {
  let a = Math.floor(Math.random() * files.length);
  return files[a];
}
function playTrack(guildId, fileName, connection) {
  const state = serverStates.get(guildId);
  if (!state) return;
  const musicDir = path.join(__dirname, 'music');
  const filePath = path.join(musicDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`[ERROR] File not found: ${fileName}`);
    serverStates.delete(guildId);
    return;
  }
  console.log(`[DEBUG] Playing: ${fileName}`);
  const resource = createAudioResource(filePath);
  const player = createAudioPlayer();
  player.play(resource);
  connection.subscribe(player);

  state.player = player;
  state.currentTrack = fileName;

  player.on(AudioPlayerStatus.Idle, () => {
    const currentState = serverStates.get(guildId);
    if (!currentState) return;
    let nextFile;

    if (currentState.mode === 'shuffle') {
      nextFile = getRandomFile(currentState.allFiles);
    }
    else if (currentState.mode === 'sequential') {
      const currentNum = parseInt(currentState.currentTrack.replace('.mp3',''));
      if (!isNaN(currentNum)) {
        nextFile = `${currentNum + 1}.mp3`;
      } else{
        console.log("Sequence broken. Stopping.");
        serverStates.delete(guildId);
        return;
      }
    }
    else{
      serverStates.delete(guildId);
      return;
    }
    playTrack(guildId, nextFile, connection);
  });
  player.on('error', error => {
    console.error(`Error playing ${fileName}:`,error);
    const currentState = serverStates.get(guildId);
    if (currentState) player.emit(AudioPlayerStatus.Idle);
  });
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
    else if (commandName === 'list') {
      const musicDir = path.join(__dirname, 'music');
      if (!fs.existsSync(musicDir)) return interaction.editReply("No music folder found.");
      const files = fs.readdirSync(musicDir).filter( f => f.endsWith('.mp3'));
      if (files.length === 0) return interaction.editReply("Your music folder is empty.");
      const limit = 41;
      const displayFiles = files.slice(0, limit);
      const listString = displayFiles.map((f) => `${f}`).join('\n');
      let msg = `**📂 Available Songs (${files.length} total):**\n${listString}`;
      if (files.length > limit) {
        msg += `\n...and ${files.length - limit} more.`;
      }
      return interaction.editReply(msg);
    }
    else if (commandName === 'connect') {
      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) return interaction.editReply("Join a voice channel first!");

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      return interaction.editReply("Connected! I am listening.");
    }
    else if (commandName === 'stop') {
      const connection = getVoiceConnection(interaction.guild.id);
      if (!connection) return interaction.editReply("I'm not playing anything.");
      connection.destroy();
      serverStates.delete(interaction.guild.id);
      return interaction.editReply("Fine! I stopped.");
    }
    else if (commandName === 'skip') {
      const connection = getVoiceConnection(interaction.guild.id);
      const state = serverStates.get(interaction.guild.id);
      if (!connection || !state || !state.player) return interaction.editReply("I'm not playing anything baka!");
      state.player.stop();
      return interaction.editReply(`Skipped`);
    }
    else if (commandName === 'play'){
      const userInput = interaction.options.getString('filename');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) return interaction.editReply("Join a voice channel first.");
      const musicDir = path.join(__dirname, 'music');
      if (!fs.existsSync(musicDir)) return interaction.editReply(`No music folder found.`);
      const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'));
      if (files.length === 0) return interaction.editReply("Your music folder is empty.");

      let startFile;
      let mode;

      if (userInput.toLowerCase() === 'all' || userInput.toLowerCase() === 'random') {
        mode = 'shuffle';
        startFile = getRandomFile(files);
      }
      else if (!isNaN(parseInt(userInput))) {
        mode = 'sequential';
        startFile = `${userInput}.mp3`;
        if (!files.includes(startFile)) {
          return interaction.editReply(`Track **${startFile}** not found.`);
        }
      }
      else {
        mode = 'single';
        startFile = files.find(f => f.toLowerCase().includes(userInput.toLowerCase()));
        if (!startFile) {
          return interaction.editReply(`I couldnt find any file matching "${userInput}".`);
        }
      }
      let connection = getVoiceConnection(interaction.guild.id);
      if (!connection) {
        try {
          connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfMute: false,
            selfDeaf: false,
          });
          await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        } catch (err) {
          return interaction.editReply("Failed to join voice channel.");
        }
      }

      serverStates.set(interaction.guild.id, {
        mode: mode,
        allFiles: files,
        currentTrack: startFile,
        player: null
      });
      playTrack(interaction.guild.id, startFile, connection);
      return interaction.editReply(`Playing **${startFile}** (${mode} mode).`);
    }
    if (reply) await interaction.editReply(reply || "I... I have nothing to say about that. Dummy.");

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
  if (msg.reference && msg.reference.messageId) {
    try {
      const repliedMessage = await msg.channel.messages.fetch(msg.reference.messageId);
      const originalMessageContent = repliedMessage.content;
      if (!originalMessageContent) {
        return msg.reply("Hmph. The message you replied to doesnt have any text for me.");
      }
      const instruction = msg.content.substring(1).trim();
      if (!instruction) {
        return msg.reply("You need to tell me what to do with that message, baka!!");
      }
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user has replied to a message and given you a task. Your job is to perform the task on the original text, but deliver the result with your tsundere personality. Be reluctant and maybe a little arrogant about it.

      For example, if asked to translate, you might say "It's not like I wanted to translate this for you, but it means..." or "Fine, I'll do it, but don't get used to it. The translation is...".
      
      --- TEXT TO PROCESS ---
      "${originalMessageContent}"
      
      --- USER'S INSTRUCTION ---
      "${instruction}"
      
      --- YOUR TSUNDERE RESPONSE ---`;

      await msg.channel.sendTyping();
      const reply = await getAiResponse(prompt);
      return msg.reply(reply || "uhh...");

    } catch(err) {
      console.error("Error processing a reply commandL:",err);
      return msg.reply("I couldnt fetch the message baka. Maybe its too old like you.");
    }
  }
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
