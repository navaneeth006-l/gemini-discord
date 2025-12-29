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

async function getAiResponse(prompt) {
  try {
    // Keeping your custom server.js logic
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

function getRandomTrack(max) {
  return Math.floor(Math.random() * max) + 1;
}

function playTrack(guildId, trackNumber, connection) {
  const state = serverStates.get(guildId);
  if (!state) return;

  const musicDir = path.join(__dirname, 'music');
  
  // FIX 1: Changed single quotes to backticks so the number works
  const fileName = `${trackNumber}.mp3`;
  const filePath = path.join(musicDir, fileName);

  if (!fs.existsSync(filePath)) {
    console.log(`Track ${trackNumber} not found. Stopping.`);
    serverStates.delete(guildId);
    return;
  }

  const resource = createAudioResource(filePath);
  const player = createAudioPlayer();

  player.play(resource);
  connection.subscribe(player);

  state.player = player;
  state.currentTrack = trackNumber;
  console.log(`Now Playing: ${fileName} (Mode: ${state.mode})`);

  player.on(AudioPlayerStatus.Idle, () => {
    const currentState = serverStates.get(guildId);
    if (!currentState) return;

    let nextTrack;

    if (currentState.mode === 'shuffle') {
      nextTrack = getRandomTrack(currentState.maxTracks);
      if (currentState.maxTracks > 1 && nextTrack === currentState.currentTrack) {
        nextTrack = getRandomTrack(currentState.maxTracks);
      }
    } else {
      nextTrack = currentState.currentTrack + 1;
    }

    playTrack(guildId, nextTrack, connection);
  });

  player.on('error', error => {
    console.error(`Error playing track ${trackNumber}:`, error);
    const currentState = serverStates.get(guildId);
    if (currentState) player.emit(AudioPlayerStatus.Idle);
  });
}

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
        await interaction.editReply({
          content: "Hmph! I'm not a web browser, baka! Don't send me links.",
          ephemeral: true
        });
        return;
      }
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. Summarize the following text in a concise way, but with a bit of your tsundere attitude: "${text}"`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'pat') {
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user, ${interaction.user.username}, just gave you a gentle headpat. Write a classic, flustered tsundere response.`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'praise') {
      const prompt = `You are a tsundere chatbot named ${BOT_NAME}. The user, ${interaction.user.username}, just praised you and said you're amazing. Write a flustered but arrogant tsundere response.`;
      reply = await getAiResponse(prompt);
    }
    else if (commandName === 'stop') {
        const connection = getVoiceConnection(interaction.guild.id);
        if (!connection) {
            return interaction.editReply("I'm not even playing anything, dummy!");
        }
        connection.destroy();
        serverStates.delete(interaction.guild.id);
        return interaction.editReply("Fine! I stopped the music.");
    }
    else if (commandName === 'play') {
      const userInput = interaction.options.getString('filename');
      const voiceChannel = interaction.member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply("Hmph. You expect me to play music to thin air? Join a voice channel first, dummy.");
      }

      const musicDir = path.join(__dirname, 'music');
      if (!fs.existsSync(musicDir)) {
        return interaction.editReply(`I couldn't find your music folder.`);
      }

      // FIX 2: Correct capitalization to 'endsWith'
      const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3'));
      const maxTracks = files.length;
      if (maxTracks === 0) return interaction.editReply("Your music folder is empty.");

      let startTrack = 1;
      let mode = 'sequential';

      if (userInput.toLowerCase() === 'all' || userInput.toLowerCase() === 'random') {
        mode = 'shuffle';
        startTrack = getRandomTrack(maxTracks);
      } else {
        const parsed = parseInt(userInput);
        if (isNaN(parsed)) {
          return interaction.editReply(`Hey! Name your files '1.mp3', '2.mp3'... and type **/play 1** or **/play all**.`);
        }
        startTrack = parsed;
        mode = 'sequential';
      }

      let connection = getVoiceConnection(interaction.guild.id);
      
      if (!connection) {
        try {
          // FIX 3: Removed 'const' so it updates the outer variable
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
        maxTracks: maxTracks,
        currentTrack: startTrack,
        player: null
      });

      playTrack(interaction.guild.id, startTrack, connection);

      if (mode === 'shuffle') {
        return interaction.editReply(`Ugh, fine. Playing **random songs** from your ${maxTracks} files.`);
      } else {
        return interaction.editReply(`Starting sequentially from Track **${startTrack}**.`);
      }
    }

    if (reply) await interaction.editReply(reply);

  } catch (error) {
    console.error("Error handling interaction:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: 'Error!', ephemeral: true });
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

    } catch (err) {
      console.error("Error processing a reply command:", err);
      return msg.reply("I couldnt fetch the message baka.");
    }
  }

  const UserInput = msg.content.substring(1).trim();
  if (!UserInput) {
      return msg.reply("Hmph. If you have a question, ask it. Don't just type a dot.");
  }

  const persona = `You are a tsundere named ${BOT_NAME}.`;
  const fullPrompt = `${persona}\nUser: ${UserInput}\n${BOT_NAME}:`;
  
  try {
    const reply = await getAiResponse(fullPrompt);
    if (!reply || reply.trim() === "") {
      msg.reply("⚠️ Hmph. I have nothing to say to that.");
      return;
    }
    msg.reply(reply);
  } catch (err) {
    msg.reply("⚠️ Error communicating with my brain.");
  }
});

client.login(DISCORD_TOKEN);
console.log("🚀 Discord Gemini bot is running...");