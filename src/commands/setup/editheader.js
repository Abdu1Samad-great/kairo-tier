    const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("editheader")
        .setDescription("Edit the ticket panel header.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("New header")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const newHeader = interaction.options.getString("text");

        const { data: settings, error } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

if (!settings) {
    return interaction.editReply({
        content: "❌ Please run `/setupticket` first."
    });
}

        const channel = interaction.guild.channels.cache.get(settings.panel_channel);
if (!channel) {
    return interaction.editReply({
        content: "❌ Ticket panel channel not found."
    });
}

        const message = await channel.messages.fetch(settings.message_id);

        const embed = EmbedBuilder.from(message.embeds[0]);

        embed.setTitle(newHeader);

        await message.edit({
            embeds: [embed]
        });

        await supabase
            .from("ticket_settings")
            .update({
                header: newHeader
            })
            .eq("guild_id", interaction.guild.id);

  return interaction.editReply({
    content:"✅ Header updated."
});

    }
};