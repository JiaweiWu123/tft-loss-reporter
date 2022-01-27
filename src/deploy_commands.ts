import 'dotenv/config';

import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
	console.log('No tokens/IDs provided, exiting...');
	process.exit(1);
}

const commands = [
	new SlashCommandBuilder()
		.setName('add_league_user')
		.setDescription('Adds a League user')
		.addStringOption((option) => {
			return option.setName('league_user').setDescription('Enter a League IGN');
		}),
	new SlashCommandBuilder()
		.setName('remove_league_user')
		.setDescription('Removes a League user')
		.addStringOption((option) => {
			return option.setName('league_user').setDescription('Enter a league IGN');
		}),
	new SlashCommandBuilder().setName('list').setDescription('Lists all watched league users'),
].map((command) => command.toJSON());

const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

rest
	.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
	.then(() => {
		console.log('Successfully registered application commands');
	})
	.catch(console.error);
