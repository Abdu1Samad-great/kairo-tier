const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const supabase = require("../database/supabase");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "unclaim") return;
    await interaction.deferUpdate();

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

    if (ticket.claimed_by !== interaction.user.id) {
        return interaction.reply({
            content: `❌ Only <@${ticket.claimed_by}> can unclaim this ticket.`,
            ephemeral: true
        });
    }

    await supabase
        .from("tickets")
        .update({
            claimed_by: null
        })
        .eq("channel_id", interaction.channel.id);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    embed.setFields(
        ...(embed.data.fields || []).filter(
            field => field.name !== "👮 Claimed By"
        )
    );

    const row = new ActionRowBuilder().addComponents(

        new ButtonBuilder()
            .setCustomId("claim")
            .setLabel("Claim")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("close")
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)

    );

await interaction.message.edit({
    embeds: [embed],
    components: [row]
});

};