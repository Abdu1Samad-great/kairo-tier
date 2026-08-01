const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const supabase = require("../database/supabase");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "close") return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", interaction.channel.id)
        .single();

    if (!ticket) {
        return interaction.editReply({
            content: "❌ Ticket not found."
        });
    }

    // Only claimer can close
    if (
        ticket.claimed_by &&
        ticket.claimed_by !== interaction.user.id
    ) {
        return interaction.editReply({
            content: `❌ Only <@${ticket.claimed_by}> can close this ticket.`
        });
    }

    // Prevent multiple confirmations
    if (ticket.close_requested_by) {
        return interaction.editReply({
            content: `❌ A close confirmation is already pending by <@${ticket.close_requested_by}>.`
        });
    }

    await supabase
        .from("tickets")
        .update({
            close_requested_by: interaction.user.id
        })
        .eq("channel_id", interaction.channel.id);

    const embed = new EmbedBuilder()
        .setColor("#f59e0b")
        .setTitle("⚠️ Confirm Ticket Closure")
        .setDescription(
`Requested By:
<@${interaction.user.id}>

Are you sure you want to close this ticket?`
        );

    const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("confirm_close")
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId("cancel_close")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)

    );

    await interaction.channel.send({
        embeds: [embed],
        components: [row]
    });

    return interaction.editReply({
        content: "✅ Confirmation message sent."
    });

};