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
    if (interaction.customId !== "claim") return;

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

    if (ticket.claimed_by) {
        return interaction.reply({
            content: `Already claimed by <@${ticket.claimed_by}>.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await supabase
        .from("tickets")
        .update({
            claimed_by: interaction.user.id
        })
        .eq("channel_id", interaction.channel.id);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    embed.setFields(
        ...(embed.data.fields || []).filter((field) => field.name !== "Claimed By"),
        {
            name: "Claimed By",
            value: `<@${interaction.user.id}>`,
            inline: false
        }
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("unclaim")
            .setLabel("Unclaim")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("close")
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger)
    );

    return interaction.update({
        embeds: [embed],
        components: [row]
    });

};