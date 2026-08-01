const supabase = require("../database/supabase");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "cancel_close") return;

    const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", interaction.channel.id)
        .single();

    if (!ticket) {
        return interaction.reply({
            content: "❌ Ticket not found.",
            ephemeral: true
        });
    }

    // Only the staff member who requested the close can cancel
    if (ticket.close_requested_by !== interaction.user.id) {
        return interaction.reply({
            content: `❌ Only <@${ticket.close_requested_by}> can cancel this closure.`,
            ephemeral: true
        });
    }

    // Reset database
    await supabase
        .from("tickets")
        .update({
            close_requested_by: null
        })
        .eq("channel_id", interaction.channel.id);

    // Delete the confirmation message
    await interaction.message.delete().catch(() => {});

};