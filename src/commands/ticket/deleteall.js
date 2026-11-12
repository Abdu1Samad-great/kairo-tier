const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "owner",
    data: new SlashCommandBuilder()
        .setName("deleteall")
        .setDescription("Delete all closed tickets."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role, closed_category")
            .eq("guild_id", interaction.guild.id)
            .single();


        if (!settings.closed_category) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Closed category is not set."
            });
        }

        const channels = interaction.guild.channels.cache.filter(
            c => c.parentId === settings.closed_category
        );

        let deleted = 0;

        for (const [, channel] of channels) {

            const vc = interaction.guild.channels.cache.find(
                x =>
                    x.parentId === settings.closed_category &&
                    x.name === channel.name &&
                    x.isVoiceBased()
            );

            if (vc) {
                await vc.delete().catch(() => {});
            }

            await supabase
                .from("tickets")
                .delete()
                .eq("channel_id", channel.id);

            await channel.delete().catch(() => {});

            deleted++;
        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Deleted **${deleted}** closed tickets.`
        });

    }
};
