import { Client, GatewayIntentBits, Events } from "discord.js";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState, VoiceConnectionStatus, getVoiceConnection } from '@discordjs/voice';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream'; 
import { promisify } from 'util';

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const streamPipeline = promisify(pipeline);

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
async function generateTTS(text, guildId) {
    try {
        console.log(`[TTS] Requesting audio for: "${text.substring(0, 20)}..."`);
        
        // Call your running Python server
        const response = await fetch("http://localhost:5000/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                text: text,
                language: "en" // We are forcing English for now
            }), 
        });

        if (!response.ok) throw new Error("TTS Server Error");

        // Create 'music' folder if it doesn't exist
        const musicDir = path.join(__dirname, 'music');
        if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir);
        
        // Save the audio file as 'tts_GUILDID.wav'
        const fileName = `tts_${guildId}.wav`;
        const filePath = path.join(musicDir, fileName);

        // Save the stream to disk
        await streamPipeline(response.body, fs.createWriteStream(filePath));
        console.log(`[TTS] Saved to ${filePath}`);
        return filePath;
    } catch (err) {
        console.error("TTS Error:", err);
        return null;
    }
}

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



function getRandomFile(files) {
   let a=Math.floor(Math.random() * files.length);
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

    if (currentState.currentTrack.startsWith('tts_')) {
        return; 
    }
    let nextFile;

    
    if (currentState.mode === 'shuffle') {
      nextFile = getRandomFile(currentState.allFiles);
    } 
    
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


client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
  await interaction.deferReply();
  let replyText="";
  
  try {
    const tsunderePrompt = `
    You are a tsundere named ${BOT_NAME}. 
    IMPORTANT: 
    1. Speak English. Use Romaji for Japanese words.
    2. BE BRIEF. Keep your response to 1 or 2 sentences MAX. 
    3. Do not write long paragraphs.
    `;
    if (commandName === 'roast') {
      const targetUser = interaction.options.getUser('user');
      const authorUser = interaction.user;
      const prompt = `You are a tsundere chatbot named ${BOT_NAME} . Your task is to write a funny roast about the user named "${targetUser.username}",who was nomuinated by "${authorUser.username}".Dont hold back.`;
      replyText = await getAiResponse(prompt);
    }
    else if (commandName === 'whatif') {
      const scenario = interaction.options.getString('scenario');
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user has a "what if" question. Respond creatively, perhaps with a little reluctance or attitude, to the following scenario: "${scenario}"`;
      replyText = await getAiResponse(prompt);
    }
    else if (commandName === 'summarize') {
      const text = interaction.options.getString('text');
      if (text.startsWith('http://') || text.startsWith('https://')) {
        await interaction.editReply({ content: "Hmph! No links!", ephemeral: true });
        return;
      }
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. Summarize: "${text}"`;
      replyText = await getAiResponse(prompt);
    }
    else if (commandName === 'pat' || commandName === 'praise') {
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. User ${interaction.user.username} interacted. React.`;
      replyText = await getAiResponse(prompt);
    }
    const connection = getVoiceConnection(interaction.guild.id);
    
    // If the bot is in a voice channel AND we have text to say...
    if (replyText && connection) {
        // Send the text to the chat first
        await interaction.editReply(`🗣️ **${BOT_NAME}:** ${replyText}`);
        
        // Generate the Audio File
        const ttsPath = await generateTTS(replyText, interaction.guild.id);
        
        if (ttsPath) {
            // Initialize state if missing (so it doesn't crash)
            if (!serverStates.has(interaction.guild.id)) {
                serverStates.set(interaction.guild.id, {
                    mode: 'single',
                    allFiles: [],
                    currentTrack: '',
                    player: null
                });
            }
            
            // Play the generated file
            playTrack(interaction.guild.id, path.basename(ttsPath), connection);
        }
        return; // Exit here, we are done
    }

    // If NOT in voice, just send text
    if (replyText) {
        await interaction.editReply(replyText);
        return;
    }
    else if (commandName === 'list'){
      const musicDir = path.join(__dirname, 'music');
      if (!fs.existsSync(musicDir)) return interaction.editReply("No music folder found.");
      const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'));
      if (files.length === 0) return interaction.editReply("Your music folder is empty.");
      const limit=41;
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
        
        // Wait for connection to be ready
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
      const state=serverStates.get(interaction.guild.id);
      if (!connection || !state || !state.player) return interaction.editReply("T'm not playing anything baka.");
      state.player.stop();
      return interaction.editReply(`Skipped`);

    }

    
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
        allFiles: files,     
        currentTrack: startFile,
        player: null
      });

      playTrack(interaction.guild.id, startFile, connection);
      return interaction.editReply(`Playing **${startFile}** (${mode} mode).`);
    }

    if (replyText) await interaction.editReply(reply);

  } catch (error) {
    console.error("Error:", error);
    if (!interaction.replied) await interaction.reply({ content: 'Error!', ephemeral: true });
  }
});


client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(".")) return;
  
  const userInput = msg.content.substring(1).trim();
  if (!userInput) return;

  const prompt = `You are a tsundere named ${BOT_NAME}. User: ${userInput}`;
  try {
    const reply = await getAiResponse(prompt);
    const connection = getVoiceConnection(msg.guild.id);
    if (reply && connection){
      msg.reply(`🗣️ ${reply}`);
        const ttsPath = await generateTTS(reply, msg.guild.id);
        if (ttsPath) {
             if (!serverStates.has(msg.guild.id)) {
                serverStates.set(msg.guild.id, { mode: 'single', allFiles: [], currentTrack: '', player: null });
            }
            playTrack(msg.guild.id, path.basename(ttsPath), connection);
    }
  }
  else{
    msg.reply(reply || "...");
    }
  } catch (err) {
    msg.reply("⚠️ Error.");
  }
});

client.login(DISCORD_TOKEN);
console.log("🚀 Tsundere Bot is running!");