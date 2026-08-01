const {
    SlashCommandBuilder,
    PermissionFlagsBits,
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resetpanel")
        .setDescription("Delete the current ticket panel and reset the setup.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const { data: settings, error } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (error || !settings) {
            return interaction.editReply({
                content: "❌ No ticket setup found."
            });
        }

        // Delete old panel if it still exists
        if (settings.panel_channel && settings.message_id) {

            try {

                const channel = interaction.guild.channels.cache.get(settings.panel_channel);

                if (channel) {

                    const message = await channel.messages.fetch(settings.message_id);

                    if (message) {
                        await message.delete();
                    }

                }

            } catch (err) {
                console.log("Old panel already deleted.");
            }

        }

        const { error: updateError } = await supabase
            .from("ticket_settings")
            .update({
                panel_channel: null,
                message_id: null,
                header: "🎫 Support Center",
                description: "Need help?\n\nChoose a category below."
            })
            .eq("guild_id", interaction.guild.id);

        if (updateError) {
    console.log(updateError);

    return interaction.editReply({
        content: "❌ Failed to reset the ticket panel."
    });
}

// Delete all buttons
const { error: buttonError } = await supabase
    .from("ticket_buttons")
    .delete()
    .eq("guild_id", interaction.guild.id);

if (buttonError) {
    console.log(buttonError);
}

return interaction.editReply({
    content: "✅ Ticket panel has been reset successfully.\nRun `/setupticket` to create a new panel."
});
        

    },
};