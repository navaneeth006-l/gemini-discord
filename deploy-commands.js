import { REST } from '@discordjs/rest';
import { SlashCommandBuilder, Routes } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID }=process.env;
const commands = [
    new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Deliver a tsundere-style roast to a user.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to roast.')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('whatif')
        .setDescription('ask a what if scenario.')
        .addStringOption(option=>
            option.setName('scenario')
                .setDescription('Scenario')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('summarize')
        .setDescription('Summarize a long piee of text')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('The text to summarize')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('pat')
        .setDescription("It's not like i want you to pat me or anything."),
    new SlashCommandBuilder()
        .setName('praise')
        .setDescription('Tell me how great I am.'),
].map(command=>command.toJSON());
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
console.log('Started refreshing application (/) commands.');
rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID), { body: commands})
    .then(()=> console.log('Successfully reloaded application (/) commands.'))
    .catch(console.error);