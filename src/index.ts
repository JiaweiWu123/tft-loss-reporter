import 'dotenv/config';

import cron from 'node-cron';
import axios from 'axios';
import { v4 } from 'uuid';
import { Client, Intents, MessageEmbed } from 'discord.js';
import User, { UserAttributes } from './models/user';

const { 
  DISCORD_TOKEN,
  RIOT_API_KEY,
} = process.env;

const MAX_USERS = 10;

const URL = `https://na1.api.riotgames.com/tft`
const AMERICAS_URL = `https://americas.api.riotgames.com/tft`
const SUMMONER_URL = (name: string) => `${URL}/summoner/v1/summoners/by-name/${name}?api_key=${RIOT_API_KEY}`;
const MATCH_IDS_URL = (puuid: string) => `${AMERICAS_URL}/match/v1/matches/by-puuid/${puuid}/ids?api_key=${RIOT_API_KEY}`;
const MATCH_URL = (matchId: string) => `${AMERICAS_URL}/match/v1/matches/${matchId}?api_key=${RIOT_API_KEY}`;
const TFT_RANK = (summonerId: string) => `${URL}/league/v1/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`;

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

const getSummoner = (name: string) => {
  return axios.get(SUMMONER_URL(name));
};

const getMatchIds = (puuid: string) => {
  return axios.get(MATCH_IDS_URL(puuid));
};

const getMatch = (matchId: string) => {
  return axios.get(MATCH_URL(matchId));
};

const getRank = (summonerId: string) => {
  return axios.get(TFT_RANK(summonerId));
};

client.once('ready', () => {
  console.log('Client ready!');
  User.sync({
    alter: true,
  });
});

const sendMessage = (embed: MessageEmbed) => {
  const channel = client.channels.cache.get('935780533596725290');
  if (channel?.isText()) {
    return channel.send({ embeds: [embed] });
  }
};

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  if (interaction.commandName === 'add_league_user') {
    const userName = interaction.user.username;
    const leagueUserName = interaction.options.getString('league_user');
    let puuid;

    if (!leagueUserName) {
      await interaction.reply({ content: 'Please provide a league name!', ephemeral: true });
      return
    }

    try {
      const { data } = await getSummoner(leagueUserName);
      puuid = data.puuid;
    } catch (error) {
      await interaction.reply({ content: `${leagueUserName} is not a valid league name`, ephemeral: true });
      return;
    }

    const usersCount = await User.count();
    if (usersCount >= MAX_USERS) {
      await interaction.reply({ content: `Max users reached ${MAX_USERS}, please delete some`, ephemeral: true });
      return;
    }

    try {
      const user = await User.create({
        id: v4(),
        name: userName,
        leagueName: leagueUserName,
        puuid,
        createdAt: new Date(),
      });

      await interaction.reply({ content: `${leagueUserName} was added.`, ephemeral: true });
      return
    } catch (error) {
      console.log(error);
      await interaction.reply({ content: `Error: couldn't add ${leagueUserName}`, ephemeral: true });
    }
  }

  if (interaction.commandName === 'list') {
    const leagueUserNames = await User.findAll();

    if (!leagueUserNames.length) {
      await interaction.reply({ content: 'No users found', ephemeral: true });
      return
    }

    const names = leagueUserNames
      .map(names => names.leagueName)
      .join('\n');
    await interaction.reply({ content: names, ephemeral: true });
  }

  if (interaction.commandName === 'remove_league_user') {
    const leagueUserName = interaction.options.getString('league_user');
    
    const rowCount = await User.destroy({ where: { leagueName: leagueUserName }});

    if (!rowCount) {
      await interaction.reply({ content: 'That user does not exist', ephemeral: true });
      return;
    }

    await interaction.reply({ content: `${leagueUserName} was deleted`, ephemeral: true });
  }
});

cron.schedule('*/2 * * * *', async () => {
  const users = await User.findAll();
  users.forEach(async (user: UserAttributes) => {
    const { data: matcheIds } = await getMatchIds(user.puuid);

    const lastMatchId = matcheIds[0];
    // NO-OP, we've already updated these
    if (user.lastUpdatedMatchId === lastMatchId) {
      return;
    }

    const { data: summoner } = await getSummoner(user.leagueName);
    const { data: ranks } = await getRank(summoner.id);

    await User.update({ lastUpdatedMatchId: lastMatchId }, { where: { id: user.id }});
    
    const { data: match } = await getMatch(lastMatchId);
    
    const participant = match.info.participants.find((part: any) => {
      return part.puuid === user.puuid;
    });
    
    const tftRank = ranks.find((rank: any) => rank.queueType === 'RANKED_TFT');

    // Don't report top 4s
    if (participant.placement <= 4) {
      return;
    }

    const embed = new MessageEmbed()
      .setTitle(`${user.leagueName} just lost!`)
      .addField('He Placed', `${participant.placement}`)
      .addField('He only eliminated', `${participant.players_eliminated} player(s)`)
      .addField('He forgot to spend', `${participant.gold_left} gold`)
      .addField('He sent it to', `level ${participant.level} trying to top 4`);
      
    if (tftRank) {
      embed
        .addField('Tier', `${tftRank.tier} ${tftRank.rank}`)
        .addField('LP', `${tftRank.leaguePoints}`);
    }
      
    embed.setFooter({ text: `Check out his new ranking: https://lolchess.gg/search?region=NA&name=${user.leagueName}` });

    await sendMessage(embed);
  });
});

client.login(DISCORD_TOKEN);
