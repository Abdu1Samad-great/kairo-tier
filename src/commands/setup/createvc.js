const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");

const supabase = require("../../database/supabase");
const { getStaffRoleIds } = require("../../utils/permissions");

module.exports = {
    permission: "staff",
    data: new SlashCommandBuilder()
        .setName("createvc")
        .setDescription("Create a voice channel for the current ticket."),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> This command can only be used inside a ticket."
            });
        }

        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (!settings) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Ticket system is not configured."
            });
        }

        const existing = interaction.guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildVoice &&
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name
        );

        if (existing) {
            return interaction.editReply({
                content: `<:Cross:1558553359642918952> Voice channel already exists: ${existing}`
            });
        }

        const staffRoleId = getStaffRoleIds(settings)[0];

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
                    id: staffRoleId,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak
                    ]
                }

            ]

        });

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Voice channel created successfully!\n${vc}`
        });

    }
};
