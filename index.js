require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionsBitField, ModalBuilder,
  TextInputBuilder, TextInputStyle, InteractionType
} = require('discord.js');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel],
});

const bulletEmoji = '<:bullet:1382090754909802547>';
const SELLER_ROLE_ID = '1382095824670163165';

// Define dinos by command
const dinosByCommand = {
  bossdragon: [
    {
      name: 'Dragon',
      seats: () => {
        const seat1Bullets = 20;
        const seat2Bullets = 25;
        const seat3Bullets = 30;
        return [
          `Seat 1: 5€ or ${seat1Bullets}k ${bulletEmoji}`,
          `Seat 2: 8€ or ${seat2Bullets}k ${bulletEmoji}`,
          `Seat 3: 10€ or ${seat3Bullets}k ${bulletEmoji}`
        ];
      },
      image: 'dragon.png',
      stats: [] // Sin stats para el dragon
    }
  ],
  dinostankes: [
    {
      name: 'Stego',
      priceMacho: `5€ or 10k ${bulletEmoji}`,
      pricePareja: `7€ or 15k ${bulletEmoji}`,
      image: 'stego.png',
      stats: [
        { name: '❤️ Health', value: '57|254', inline: true }
      ]
    },
    {
      name: 'Carbonemys',
      priceMacho: `5€ or 10k ${bulletEmoji}`,
      pricePareja: `7€ or 15k ${bulletEmoji}`,
      image: 'carbo.png',
      stats: [
        { name: '❤️ Health', value: '66|254', inline: true }
      ]
    }
  ],
  dinospvp: [
    {
      name: 'Thylacoleo',
      priceMacho: `7€ ${bulletEmoji}`,
      pricePareja: `20k ${bulletEmoji}`,
      image: 'thyla.png',
      stats: [
        { name: '❤️ Health', value: '54|126', inline: true }
      ]
    },
    {
      name: 'Rex',
      priceMacho: `10€ ${bulletEmoji}`,
      pricePareja: `30k ${bulletEmoji}`,
      image: 'rex.png',
      stats: [
        { name: '❤️ Health', value: '60|150', inline: true },
        { name: '💥 Damage', value: '45|120', inline: true }
      ]
    }
  ],
  // Agrega otros comandos y dinos como quieras
};

client.once('ready', () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!')) return;

  const command = message.content.slice(1).toLowerCase();

  if (!dinosByCommand[command]) return;

  const dinos = dinosByCommand[command];

  for (const dino of dinos) {
    // Si el dino tiene .seats() (bossdragon), muestra solo seats con precio random
    const description = dino.seats ? dino.seats().join('\n') :
      `**💰 Prices:**\n- Male: ${dino.priceMacho}\n- Pair: ${dino.pricePareja}`;

    const embed = {
      title: `🦖 Dino Available: ${dino.name}`,
      description,
      color: 0x00bfff,
      image: { url: `attachment://${dino.image}` },
      fields: dino.stats,
      footer: { text: 'ARK Dino Store • Purchase Ticket' }
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_ticket_${dino.name.toLowerCase()}`)
        .setLabel('🎫 Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({
      embeds: [embed],
      files: [{
        attachment: path.join(__dirname, dino.image),
        name: dino.image
      }],
      components: [row]
    });
  }
});
client.on('interactionCreate', async interaction => {
if (interaction.isButton()) {
  if (interaction.customId === 'close_ticket') {
    if (!interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ This button only works inside a ticket channel.', ephemeral: true });
    }

    await interaction.reply({ content: '🗑️ Closing ticket and deleting channel...', ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(console.error);
    }, 3000);

    return;
  }
    // Crear ticket
    if (interaction.customId.startsWith('create_ticket_')) {
      const dinoName = interaction.customId.replace('create_ticket_', '');
      const normalized = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
      const ticketName = `ticket-${dinoName}-${normalized}`;

      const exists = interaction.guild.channels.cache.find(c => c.name === ticketName);
      if (exists) {
        return interaction.reply({ content: '⚠️ Ya tienes un ticket abierto para este dino.', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId(`modal_${dinoName}_${interaction.user.id}`)
        .setTitle('Método de Pago');

      const input = new TextInputBuilder()
        .setCustomId('payment')
        .setLabel('¿Cómo quieres pagar? (Ingame o PP)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ingame / PP')
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    }
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    const [_, dinoName, userId] = interaction.customId.split('_');

    if (interaction.user.id !== userId) {
      return interaction.reply({ content: '❌ Este modal no es para ti.', ephemeral: true });
    }

    const payment = interaction.fields.getTextInputValue('payment');
    const normalized = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
    const ticketName = `ticket-${dinoName}-${normalized}`;

    const adminRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'admin');

    const channel = await interaction.guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        {
          id: SELLER_ROLE_ID,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        },
        ...(adminRole ? [{
          id: adminRole.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }] : [])
      ]
    });

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `📦 Nuevo ticket para **${dinoName}** creado por <@${interaction.user.id}>.\n💳 Método de pago: **${payment}**\n<@&${SELLER_ROLE_ID}>`,
      components: [closeButton]
    });

    await interaction.reply({ content: `✅ Ticket creado: <#${channel.id}>`, ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);