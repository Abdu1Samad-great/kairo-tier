const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const supabase = require("../database/supabase");


module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "claim") return;
    await interaction.deferUpdate();

    const { data: settings } = await supabase
        .from("ticket_settings")
        .select("staff_role")
        .eq("guild_id", interaction.guild.id)
        .single();

    if (!settings?.staff_role) {
        return interaction.followUp({
            content: "❌ No staff role configured.",
            ephemeral: true
        });
    }

    if (!interaction.member.roles.cache.has(settings.staff_role)) {
        return interaction.followUp({
            content: "❌ Only staff members can claim tickets.",
            ephemeral: true
        });
    }

    const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", interaction.channel.id)
        .single();

    if (!ticket) {
        return interaction.followUp({
            content: "❌ Ticket not found.",
            ephemeral: true
        });
    }

    if (ticket.claimed_by) {
        return interaction.followUp({
            content: `❌ Already claimed by <@${ticket.claimed_by}>.`,
            ephemeral: true
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
        ...(embed.data.fields || []).filter(f => f.name !== "👮 Claimed By"),
        {
            name: "👮 Claimed By",
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

await interaction.message.edit({
    embeds: [embed],
    components: [row]
});

};