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

    const { data: settings } = await supabase
        .from("ticket_settings")
        .select("staff_role")
        .eq("guild_id", interaction.guild.id)
        .single();

    if (!settings?.staff_role) {
        return interaction.reply({
            content: "❌ No staff role configured.",
            flags: MessageFlags.Ephemeral
        });
    }

    if (!interaction.member.roles.cache.has(settings.staff_role)) {
        return interaction.reply({
            content: "❌ Only staff members can claim tickets.",
            flags: MessageFlags.Ephemeral
        });
    }

    const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", interaction.channel.id)
        .single();

    if (!ticket) {
        return interaction.reply({
            content: "❌ Ticket not found.",
            flags: MessageFlags.Ephemeral
        });
    }

    if (ticket.claimed_by) {
        return interaction.reply({
            content: `❌ Already claimed by <@${ticket.claimed_by}>.`,
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

    return interaction.update({
        embeds: [embed],
        components: [row]
    });

};