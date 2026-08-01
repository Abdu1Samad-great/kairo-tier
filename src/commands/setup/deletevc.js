const {
    SlashCommandBuilder,
    ChannelType
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deletevc")
        .setDescription("Delete the voice channel for the current ticket."),

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

        // Staff Check
        if (!interaction.member.roles.cache.has(settings.staff_role)) {
            return interaction.editReply({
                content: "❌ You don't have permission to use this command."
            });
        }

        // Find VC
        const vc = interaction.guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildVoice &&
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name
        );

        if (!vc) {
            return interaction.editReply({
                content: "❌ No voice channel exists for this ticket."
            });
        }

        await vc.delete("Ticket voice channel deleted");

        return interaction.editReply({
            content: "✅ Voice channel deleted successfully."
        });

    }
};