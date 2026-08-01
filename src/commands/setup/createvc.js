const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createvc")
        .setDescription("Create a voice channel for the current ticket."),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        // Check if ticket
        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a ticket."
            });
        }

        // Get settings
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (!settings) {
            return interaction.editReply({
                content: "❌ Ticket system is not configured."
            });
        }

        // Staff check
        if (!interaction.member.roles.cache.has(settings.staff_role)) {
            return interaction.editReply({
                content: "❌ You don't have permission to use this command."
            });
        }

        // Check if VC already exists
        const existing = interaction.guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildVoice &&
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name
        );

        if (existing) {
            return interaction.editReply({
                content: `❌ Voice channel already exists: ${existing}`
            });
        }

        // Create VC
        const vc = await interaction.guild.channels.create({

            name: interaction.channel.name,

            type: ChannelType.GuildVoice,

            parent: interaction.channel.parentId,

            permissionOverwrites: [

                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },

                {
                    id: ticket.owner_id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak
                    ]
                },

                {
                    id: settings.staff_role,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak
                    ]
                }

            ]

        });

        return interaction.editReply({
            content: `✅ Voice channel created successfully!\n${vc}`
        });

    }
};