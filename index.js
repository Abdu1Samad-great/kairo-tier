console.log("BOT STARTED");

require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionsBitField
} = require('discord.js');

const LOG_CHANNEL_ID = '1517024321355120711';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Temporary database
const db = new Map();

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

    console.log(
        "INTERACTION:",
        interaction.commandName || interaction.customId
    );

    // ================= SLASH COMMANDS =================

    if (interaction.isChatInputCommand()) {

        // ================= SETUP PANEL =================

        if (interaction.commandName === 'setuppanel') {

            if (
                !interaction.member.permissions.has(
                    PermissionsBitField.Flags.Administrator
                )
            ) {
                return interaction.reply({
                    content: "❌ Only staff can use this command.",
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🎮 Minecraft Registration Panel')
                .setDescription(
                    'Click the button below to register your profile 📝'
                )
                .setColor('Red');

            const button = new ButtonBuilder()
                .setCustomId('open_register')
                .setLabel('📝 Register')
                .setStyle(ButtonStyle.Danger);

            return interaction.reply({
                embeds: [embed],
                components: [
                    new ActionRowBuilder().addComponents(button)
                ]
            });
        }

        // ================= STAFF PROMOTE =================

        if (interaction.commandName === 'staff-promote') {            try {

                const user =
                    interaction.options.getUser('user');

                const oldRole =
                    interaction.options.getRole('old_role');

                const newRole =
                    interaction.options.getRole('new_role');

                const member =
                    await interaction.guild.members.fetch(user.id);

                await member.roles.remove(oldRole);
                await member.roles.add(newRole);

                const embed = new EmbedBuilder()
                    .setTitle('📈 STAFF PROMOTION')
                    .setColor('Green')
                    .setThumbnail(
                        user.displayAvatarURL()
                    )
                    .addFields(
                        {
                            name: '👤 Staff Member',
                            value: `${user}`
                        },
                        {
                            name: '❌ Removed Role',
                            value: `${oldRole}`
                        },
                        {
                            name: '✅ New Role',
                            value: `${newRole}`
                        },
                        {
                            name: '🛡️ Promoted By',
                            value: `${interaction.user}`
                        }
                    )
                    .setTimestamp();

                const logChannel =
                    interaction.guild.channels.cache.get(
                        LOG_CHANNEL_ID
                    );

                if (logChannel) {
                    await logChannel.send({
                        embeds: [embed]
                    });
                }

                return interaction.reply({
                    content: `✅ Successfully promoted ${user.tag}`,
                    ephemeral: true
                });

            } catch (err) {

                console.error(err);

                return interaction.reply({
                    content:
                        '❌ Promotion failed. Check role hierarchy and permissions.',
                    ephemeral: true
                });
            }
        }

        // ================= STAFF DEMOTE =================

        if (interaction.commandName === 'staff-demote') {

            try {

                const user =
                    interaction.options.getUser('user');

                const oldRole =
                    interaction.options.getRole('old_role');

                const newRole =
                    interaction.options.getRole('new_role');

                const member =
                    await interaction.guild.members.fetch(user.id);

                await member.roles.remove(oldRole);
                await member.roles.add(newRole);

                const embed = new EmbedBuilder()
                    .setTitle('📉 STAFF DEMOTION')
                    .setColor('Red')
                    .setThumbnail(
                        user.displayAvatarURL()
                    )
                    .addFields(
                        {
                            name: '👤 Staff Member',
                            value: `${user}`
                        },
                        {
                            name: '❌ Removed Role',
                            value: `${oldRole}`
                        },
                        {
                            name: '✅ New Role',
                            value: `${newRole}`
                        },
                        {
                            name: '🛡️ Demoted By',
                            value: `${interaction.user}`
                        }
                    )
                    .setTimestamp();

                const logChannel =
                    interaction.guild.channels.cache.get(
                        LOG_CHANNEL_ID
                    );

                if (logChannel) {
                    await logChannel.send({
                        embeds: [embed]
                    });
                }

                return interaction.reply({
                    content: `✅ Successfully demoted ${user.tag}`,
                    ephemeral: true
                });

            } catch (err) {

                console.error(err);

                return interaction.reply({
                    content:
                        '❌ Demotion failed. Check role hierarchy and permissions.',
                    ephemeral: true
                });
            }
        }

        // ================= INFO COMMAND =================

        if (interaction.commandName === 'info') {            const targetUser =
                interaction.options.getUser('user') ||
                interaction.user;

            const data = db.get(targetUser.id);

            if (!data) {
                return interaction.reply({
                    content: `❌ No data found for ${targetUser.username}`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎮 Player Info | ${targetUser.username}`)
                .setColor("Red")
                .addFields(
                    {
                        name: "🧑 IGN",
                        value: data.ign || "N/A",
                        inline: true
                    },
                    {
                        name: "🌍 Region",
                        value: data.region || "N/A",
                        inline: true
                    },
                    {
                        name: "💳 Type",
                        value: data.type || "N/A",
                        inline: true
                    }
                )
                .setThumbnail(
                    targetUser.displayAvatarURL()
                )
                .setFooter({
                    text: "Minecraft Verification System 🔥"
                })
                .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }
    }

    // ================= BUTTONS =================

    if (interaction.isButton()) {

        if (interaction.customId === 'open_register') {

            const modal = new ModalBuilder()
                .setCustomId('register_modal')
                .setTitle('Minecraft Registration 📝');

            const ign = new TextInputBuilder()
                .setCustomId('ign')
                .setLabel('Enter your IGN')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const region = new TextInputBuilder()
                .setCustomId('region')
                .setLabel('Region (AS / EU / AM / AF)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const type = new TextInputBuilder()
                .setCustomId('type')
                .setLabel('Account Type (Cracked / Premium)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(ign),
                new ActionRowBuilder().addComponents(region),
                new ActionRowBuilder().addComponents(type)
            );

            return interaction.showModal(modal);
        }
    }

    // ================= MODAL SUBMIT =================

    if (interaction.isModalSubmit()) {

        if (interaction.customId === 'register_modal') {

            const ignValue =
                interaction.fields.getTextInputValue('ign');

            const regionValue =
                interaction.fields.getTextInputValue('region');

            const typeValue =
                interaction.fields.getTextInputValue('type');

            db.set(interaction.user.id, {
                ign: ignValue,
                region: regionValue,
                type: typeValue
            });

            const role =
                interaction.guild.roles.cache.find(
                    r => r.name === "Verified"
                );

            if (role) {

                const member =
                    await interaction.guild.members.fetch(
                        interaction.user.id
                    );

                await member.roles.add(role);
            }

            return interaction.reply({
                content:
                    "✅ Registration Complete! You are now verified 🎉",
                ephemeral: true
            });
        }
    }
})
;const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error(
        'Missing DISCORD_TOKEN in environment.'
    );
    process.exit(1);
}
console.log("Bot is starting...");
client.login(token);