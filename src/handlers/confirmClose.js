const supabase = require("../database/supabase");
const { MessageFlags } = require("discord.js");
const closeTicketChannel = require("../utils/closeTicketChannel");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "confirm_close") return;

    const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", interaction.channel.id)
        .single();

    if (!ticket) {
        return interaction.reply({
            content: "Ticket not found.",
            flags: MessageFlags.Ephemeral
        });
    }

    if (!ticket.close_requested_by) {
        return interaction.reply({
            content: "There is no pending close request for this ticket.",
            flags: MessageFlags.Ephemeral
        });
    }

    await supabase
        .from("tickets")
        .update({
            close_requested_by: null
        })
        .eq("channel_id", interaction.channel.id);

    await interaction.update({
        content: "Ticket will be closed in **5 seconds...**",
        embeds: [],
        components: []
    });

    setTimeout(async () => {
        await closeTicketChannel(
            interaction.channel,
            interaction.guild,
            ticket,
            interaction.user.id
        );
    }, 5000);

};