const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");
const updatePanel = require("../../utils/panelManager");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("resendpanel")
        .setDescription("Resend the ticket panel."),

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
                content: "<:Cross:1558553359642918952> Ticket panel has not been setup."
            });
        }

        const channel = interaction.guild.channels.cache.get(settings.panel_channel);

        if (!channel) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Panel channel not found."
            });
        }

        try {

            const oldMessage = await channel.messages.fetch(settings.message_id);

            await oldMessage.delete();

        } catch {}

        await updatePanel(interaction.guild);

        return interaction.editReply({
            content: "<:tick:1558554326887047228> Ticket panel has been resent successfully."
        });

    }
};
