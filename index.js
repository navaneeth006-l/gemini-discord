import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

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

const BOT_NAME = "dickhead";
const serverStates = new Map();

// --- API FUNCTION (Your Server.js Logic) ---
async function getAiResponse(prompt) {
  try {
    const response = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await response.json();
    return data?.reply;
  } catch (err) {
    console.error("Error calling local API:", err);
    return "Something went wrong";
  }
}

// --- MUSIC HELPERS ---

function getRandomFile(files) {
    return files[Math.floor(Math.random() * files.length)];
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

  // --- WHAT HAPPENS WHEN SONG ENDS ---
  player.on(AudioPlayerStatus.Idle, () => {
    const currentState = serverStates.get(guildId);
    if (!currentState) return;

    let nextFile;

    // 1. SHUFFLE MODE: Pick random
    if (currentState.mode === 'shuffle') {
      nextFile = getRandomFile(currentState.allFiles);
    } 
    // 2. SEQUENTIAL MODE: (1.mp3 -> 2.mp3)
    else if (currentState.mode === 'sequential') {
        const currentNum = parseInt(currentState.currentTrack.replace('.mp3', ''));
        if (!isNaN(currentNum)) {
            nextFile = `${currentNum + 1}.mp3`;
        } else {
            console.log("Sequence broken. Stopping.");
            serverStates.delete(guildId);
            return;
        }
    }
    // 3. SINGLE MODE: Stop after playing the named file
    else {
        serverStates.delete(guildId);
        return;
    }

    playTrack(guildId, nextFile, connection);
  });

  player.on('error', error => {
    console.error(`Error playing ${fileName}:`, error);
    const currentState = serverStates.get(guildId);
    if (currentState) player.emit(AudioPlayerStatus.Idle);
  });
}

// --- COMMAND HANDLER ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  await interaction.deferReply();
  let reply;
  
  try {
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
        await interaction.editReply({ content: "Hmph! No links!", ephemeral: true });
        return;
      }
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. Summarize: "${text}"`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'pat' || commandName === 'praise') {
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. User ${interaction.user.username} interacted. React.`;
      reply = await getAiResponse(prompt);
    }
    
    // --- STOP COMMAND ---
    else if (commandName === 'stop') {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection) return interaction.editReply("I'm not playing anything.");
        connection.destroy();
        serverStates.delete(interaction.guild.id);
        return interaction.editReply("Fine! I stopped.");
    }

    // --- PLAY COMMAND (UPDATED) ---
    else if (commandName === 'play') {
      const userInput = interaction.options.getString('filename');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) return interaction.editReply("Join a voice channel first.");

      const musicDir = path.join(__dirname, 'music');
      if (!fs.existsSync(musicDir)) return interaction.editReply(`No music folder found.`);
      
      const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'));
      if (files.length === 0) return interaction.editReply("Your music folder is empty.");

      let startFile;
      let mode;

      // CASE 1: Shuffle
      if (userInput.toLowerCase() === 'all' || userInput.toLowerCase() === 'random') {
          mode = 'shuffle';
          startFile = getRandomFile(files);
      } 
      // CASE 2: Integer (Sequential)
      else if (!isNaN(parseInt(userInput))) {
          mode = 'sequential';
          startFile = `${userInput}.mp3`;
          if (!files.includes(startFile)) {
              return interaction.editReply(`Track **${startFile}** not found.`);
          }
      } 
      // CASE 3: Filename Search (Single Song)
      else {
          mode = 'single';
          // Find partial match (e.g. "doom" matches "doom_soundtrack.mp3")
          startFile = files.find(f => f.toLowerCase().includes(userInput.toLowerCase()));
          
          if (!startFile) {
              return interaction.editReply(`I couldn't find any file matching "${userInput}".`);
          }
      }

      let connection = getVoiceConnection(interaction.guild.id);
      
      if (!connection) {
        try {
          connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfMute: false, selfDeaf: false,
          });
          await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        } catch (err) {
          return interaction.editReply("Failed to join voice channel.");
        }
      }

      serverStates.set(interaction.guild.id, {
        mode: mode,
        allFiles: files,     // Save list for shuffle
        currentTrack: startFile,
        player: null
      });

      playTrack(interaction.guild.id, startFile, connection);
      return interaction.editReply(`Playing **${startFile}** (${mode} mode).`);
    }

    if (reply) await interaction.editReply(reply);

  } catch (error) {
    console.error("Error:", error);
    if (!interaction.replied) await interaction.reply({ content: 'Error!', ephemeral: true });
  }
});

// --- MESSAGE HANDLER ---
client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(".")) return;
  
  // (Keep your existing reply logic/What-if/Translate logic here)
  // I'm keeping the simple chat interface for brevity, but your specific
  // logic from the previous file works fine here too.
  const userInput = msg.content.substring(1).trim();
  if (!userInput) return;

  const prompt = `You are a tsundere named ${BOT_NAME}. User: ${userInput}`;
  try {
    const reply = await getAiResponse(prompt);
    msg.reply(reply || "...");
  } catch (err) {
    msg.reply("⚠️ Error.");
  }
});

client.login(DISCORD_TOKEN);
console.log("🚀 Tsundere Bot is running!");