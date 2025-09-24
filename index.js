require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, StringSelectMenuBuilder } = require('discord.js');

const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Discord Music Bot is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Express server running on port ${port}`);
});


const { Shoukaku, Connectors } = require('shoukaku');
const { Kazagumo, KazagumoTrack } = require('kazagumo');

const nodes = [{
  name: 'main',
  url: 'lava-v4.ajieblogs.eu.org:80',
  auth: 'https://dsc.gg/ajidevserver',
  secure: false,
}];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes);

const kazagumo = new Kazagumo({
  defaultSearchEngine: 'youtube_music',
  send: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  }
}, new Connectors.DiscordJS(client), nodes);

// YouTube Music only search function
async function searchTrack(query, requester) {
  try {
    // Removed searching log as requested
    
    // Prepare search query
    let searchQuery = query;
    
    // If it's a direct URL, use as-is, otherwise add YouTube Music search prefix
    if (!query.startsWith('http') && !query.includes(':')) {
      searchQuery = 'ytmsearch:' + query;
    }
    
    const res = await kazagumo.search(searchQuery, { requester });
    
    if (res.loadType !== 'empty' && res.tracks && res.tracks.length > 0) {
      // Successfully found tracks
      return res;
    }
    
    // No results found
    throw new Error('No tracks found on YouTube Music for your search query');
    
  } catch (error) {
    console.error('YouTube Music search failed:', error.message);
    throw error;
  }
}

const commands = [
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song')
    .addStringOption(option => 
      option.setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),
  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current song'),
  new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next song'),
  new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current queue'),
  new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show currently playing song'),
  new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the queue'),
  new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop mode')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )),
  new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue')
    .addIntegerOption(option =>
      option.setName('position')
        .setDescription('Position in queue')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('move')
    .setDescription('Move a song to a different position')
    .addIntegerOption(option =>
      option.setName('from')
        .setDescription('From position')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('to')
        .setDescription('To position')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription('Clear the queue'),
  new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops the music and leaves'),
  new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the volume')
    .addIntegerOption(option =>
      option.setName('level')
        .setDescription('Volume level (0-100)')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('247')
    .setDescription('Toggle 24/7 mode'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all commands'),
  new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get bot invite link'),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows bot ping'),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows bot statistics'),
  new SlashCommandBuilder()
    .setName('support')
    .setDescription('Join our support server'),

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  client.user.setActivity('/help ', { type: ActivityType.Listening });

  try {
    console.log('Refreshing slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash commands registered.');
  } catch (error) {
    console.error(error);
  }
});

function createMusicEmbed(track) {
  return new EmbedBuilder()
    .setTitle('🎵 Now Playing')
    .setDescription(`[${track.title}](${track.uri})`)
    .addFields(
      { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
      { name: '⏱️ Duration', value: formatDuration(track.length || track.duration), inline: true }
    )
    .setThumbnail(track.thumbnail || track.artworkUrl)
    .setColor('#FF0000');
}

function formatDuration(duration) {
  if (!duration || duration === 0) return 'Unknown';
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createControlButtons() {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('pause')
          .setLabel('Pause/Resume')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('skip')
          .setLabel('Skip')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('loop')
          .setLabel('Loop')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('queue')
          .setLabel('Queue')
          .setStyle(ButtonStyle.Secondary)
      )
  ];
}

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

    if (interaction.isButton()) {
      // For buttons, reply immediately with ephemeral response
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ ephemeral: true });
      }

      if (!interaction.member.voice.channel) {
        return interaction.editReply({ content: 'You need to join a voice channel to use the buttons!' });
      }
      const player = kazagumo.players.get(interaction.guild.id);
      if (!player) return interaction.editReply({ content: 'No player found!' });

      const currentTrack = player.queue.current;
      if (!currentTrack) return interaction.editReply({ content: 'No track is currently playing!' });

      if (currentTrack.requester.id !== interaction.user.id) {
        return interaction.editReply({ content: 'Only the person who requested this song can use these buttons!' });
      }

      switch (interaction.customId) {
        case 'pause':
          player.pause(!player.paused);
          await interaction.editReply({ content: player.paused ? 'Paused' : 'Resumed' });
          break;
        case 'skip':
          const skipMessage = player.data.get('currentMessage');
          if (skipMessage && skipMessage.editable) {
            try {
              const disabledButtons = skipMessage.components[0].components.map(button => {
                return ButtonBuilder.from(button).setDisabled(true);
              });
              await skipMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
            } catch (err) {
              console.error('Error disabling buttons:', err);
            }
          }
          if (player.queue.size === 0) {
            const queueEndEmbed = new EmbedBuilder()
              .setDescription('Queue has ended!')
              .setColor('#FF0000')
              .setTimestamp();
            await interaction.channel.send({ embeds: [queueEndEmbed] });
            player.data.set('manualStop', true);
          }
          player.skip();
          await interaction.editReply({ content: 'Skipped' });
          break;
        case 'stop':
          const stopMessage = player.data.get('currentMessage');
          if (stopMessage && stopMessage.editable) {
            try {
              const disabledButtons = stopMessage.components[0].components.map(button => {
                return ButtonBuilder.from(button).setDisabled(true);
              });
              await stopMessage.edit({ components: [new ActionRowBuilder().addComponents(disabledButtons)] });
            } catch (err) {
              console.error('Error disabling buttons:', err);
            }
          }
          player.data.set('manualStop', true);
          const stopEmbed = new EmbedBuilder()
            .setDescription('Queue has ended!')
            .setColor('#FF0000')
            .setTimestamp();
          await interaction.channel.send({ embeds: [stopEmbed] });
          player.destroy();
          await interaction.editReply({ content: 'Stopped' });
          break;
        case 'loop':
          const currentLoop = player.loop || 'none';
          const newLoop = currentLoop === 'none' ? 'track' : 'none';
          player.setLoop(newLoop);
          await interaction.editReply({ content: `Loop: ${newLoop === 'none' ? 'Disabled' : 'Enabled'}` });
          break;
        case 'queue':
          const queue = player.queue;
          const currentTrack2 = player.queue.current;
          let description = queue.size > 0 ? queue.map((track, i) =>
            `${i + 1}. [${track.title}](${track.uri})`).join('\n') : 'No songs in queue';

          if (currentTrack2) description = `**Now Playing:**\n[${currentTrack2.title}](${currentTrack2.uri})\n\n**Queue:**\n${description}`;

          const embed = new EmbedBuilder()
            .setTitle('Queue')
            .setDescription(description)
            .setColor('#FF0000')
            .setTimestamp();
          await interaction.editReply({ embeds: [embed] });
          break;
      }
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'filter') {
      // For select menus, reply with ephemeral response
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ ephemeral: true });
      }

      const player = kazagumo.players.get(interaction.guild.id);
      if (!player) return interaction.editReply({ content: 'No player found!' });

      const filter = interaction.values[0];
      player.shoukaku.setFilters({
        [filter]: true
      });

      const embed = new EmbedBuilder()
        .setDescription(`🎵 Applied filter: ${filter}`)
        .setColor('#FF0000')
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (!interaction.isCommand()) return;

    // For commands, defer with non-ephemeral response
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferReply();
    }

    const { commandName, options } = interaction;

    switch (commandName) {
      case 'play':
        if (!interaction.member.voice.channel) {
          return interaction.editReply({ content: 'Join a voice channel first!' });
        }

        let player = kazagumo.players.get(interaction.guild.id);
        
        if (!player) {
          player = await kazagumo.createPlayer({
            guildId: interaction.guild.id,
            voiceId: interaction.member.voice.channel.id,
            textId: interaction.channel.id,
            deaf: true
          });
        }

        // Ensure player is connected to voice channel
        if (player.voiceId !== interaction.member.voice.channel.id) {
          player.setVoiceChannel(interaction.member.voice.channel.id);
        }

        if (!player.twentyFourSeven) player.twentyFourSeven = false;

        const query = options.getString('query');
        
        try {
          // Use enhanced search function with fallback
          const res = await searchTrack(query, interaction.user);

          if (res.loadType === 'empty' || !res.tracks.length) {
            const errorEmbed = new EmbedBuilder()
              .setTitle('❌ No Results Found')
              .setDescription('No tracks found for your search query. Please try:\n• Different keywords\n• Artist name + song title\n• A direct URL')
              .setColor('#FF0000')
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
          }

          if (res.loadType === 'error') {
            const errorEmbed = new EmbedBuilder()
              .setTitle('⚠️ Search Error')
              .setDescription('An error occurred while searching. Please try again or use a different search term.')
              .setColor('#FF0000')
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
          }

          // Handle playlist loading
          if (res.loadType === 'playlist') {
            const playlist = res.playlist;
            const tracks = res.tracks;
            
            tracks.forEach(track => player.queue.add(track));
            
            const playlistEmbed = new EmbedBuilder()
              .setTitle('📋 Playlist Added')
              .setDescription(`Added **${tracks.length}** tracks from [${playlist.name}](${query})`)
              .addFields(
                { name: '🎵 First Track', value: `[${tracks[0].title}](${tracks[0].uri})`, inline: true },
                { name: '⏱️ Total Duration', value: formatDuration(tracks.reduce((acc, track) => acc + (track.length || 0), 0)), inline: true }
              )
              .setColor('#1DB954')
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();
            await interaction.editReply({ embeds: [playlistEmbed] });
          } else {
            // Single track
            const track = res.tracks[0];
            player.queue.add(track);
            
            const embed = new EmbedBuilder()
              .setTitle('✅ Track Added')
              .setDescription(`[${track.title}](${track.uri})`)
              .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: formatDuration(track.length || track.duration), inline: true },
                { name: '📍 Position', value: `${player.queue.size}`, inline: true }
              )
              .setThumbnail(track.thumbnail || track.artworkUrl)
              .setColor('#1DB954')
              .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
          }
          
          // Start playing if not already playing
          if (!player.playing && !player.paused) {
            try {
              await player.play();
            } catch (playError) {
              console.error('Error starting playback:', playError);
              const playErrorEmbed = new EmbedBuilder()
                .setTitle('❌ Playback Error')
                .setDescription('Failed to start playback. Please try again or check if the bot has proper permissions.')
                .setColor('#FF0000')
                .setFooter({
                  text: `Requested by ${interaction.user.tag}`,
                  iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();
              await interaction.followUp({ embeds: [playErrorEmbed] });
            }
          }
          
        } catch (error) {
          console.error('Play command error:', error);
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Search Failed')
            .setDescription(`Failed to search for tracks: ${error.message}\n\nPlease try:\n• A different search term\n• Checking your internet connection\n• Using a direct URL`)
            .setColor('#FF0000')
            .setFooter({
              text: `Requested by ${interaction.user.tag}`,
              iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();
          await interaction.editReply({ embeds: [errorEmbed] });
        }
        break;

      case 'pause':
        const pausePlayer = kazagumo.players.get(interaction.guild.id);
        if (!pausePlayer) return interaction.editReply({ content: 'Not playing anything!' });

        pausePlayer.pause(true);
        const pauseEmbed = new EmbedBuilder()
          .setDescription('⏸️ Paused')
          .setColor('#FF0000')
          .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();
        await interaction.editReply({ embeds: [pauseEmbed] });
        break;

      case 'resume':
        const resumePlayer = kazagumo.players.get(interaction.guild.id);
        if (!resumePlayer) return interaction.editReply({ content: 'Not playing anything!' });

        resumePlayer.pause(false);
        const resumeEmbed = new EmbedBuilder()
          .setDescription('▶️ Resumed')
          .setColor('#FF0000')
          .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();
        await interaction.editReply({ embeds: [resumeEmbed] });
        break;

      case 'skip':
        const skipPlayer = kazagumo.players.get(interaction.guild.id);
        if (!skipPlayer) return interaction.editReply({ content: 'Not playing anything!' });

        skipPlayer.skip();
        const skipEmbed = new EmbedBuilder()
          .setDescription('⏭️ Skipped')
          .setColor('#FF0000')
          .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();
        await interaction.editReply({ embeds: [skipEmbed] });
        break;

      case 'queue':
        const queuePlayer = kazagumo.players.get(interaction.guild.id);
        if (!queuePlayer) return interaction.editReply({ content: 'Not playing anything!' });

        const queue = queuePlayer.queue;
        const currentTrack = queuePlayer.queue.current;
        let description = queue.size > 0 ? queue.map((track, i) =>
          `${i + 1}. [${track.title}](${track.uri})`).join('\n') : 'No songs in qu
