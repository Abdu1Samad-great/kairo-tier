const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");
const updatePanel = require("../../utils/panelManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resendpanel")
        .setDescription("Resend the ticket panel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (!settings) {
            return interaction.editReply({
                content: "❌ Ticket panel has not been setup."
            });
        }

        const channel = interaction.guild.channels.cache.get(settings.panel_channel);

        if (!channel) {
            return interaction.editReply({
                content: "❌ Panel channel not found."
            });
        }

        // Delete old panel
        try {

            const oldMessage = await channel.messages.fetch(settings.message_id);

            await oldMessage.delete();

        } catch {}

        // Create new panel
        await updatePanel(interaction.guild);

        return interaction.editReply({
            content: "✅ Ticket panel has been resent successfully."
        });

    }
};