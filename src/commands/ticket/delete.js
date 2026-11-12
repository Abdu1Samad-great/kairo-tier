const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "owner",
    data: new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Delete a ticket permanently."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> This is not a ticket."
            });
        }

        const vc = interaction.guild.channels.cache.find(
            c =>
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name &&
                c.isVoiceBased()
        );

        if (vc) {
            await vc.delete().catch(() => {});
        }

        await supabase
            .from("tickets")
            .delete()
            .eq("channel_id", interaction.channel.id);

        await interaction.editReply({
            content: "<:tick:1558554326887047228> Ticket deleted."
        });

        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 1000);

    }
};
