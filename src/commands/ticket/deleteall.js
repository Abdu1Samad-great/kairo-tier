const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("deleteall")
        .setDescription("Delete all closed tickets."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Owner Role Check
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role, closed_category")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (
            !settings?.owner_role ||
            !interaction.member.roles.cache.has(settings.owner_role)
        ) {
            return interaction.editReply({
                content: "❌ Only the Owner Role can use this command."
            });
        }

        if (!settings.closed_category) {
            return interaction.editReply({
                content: "❌ Closed category is not set."
            });
        }

        // Get all channels in closed category
        const channels = interaction.guild.channels.cache.filter(
            c => c.parentId === settings.closed_category
        );

        let deleted = 0;

        for (const [, channel] of channels) {

            // Delete linked VC
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
            content: `✅ Deleted **${deleted}** closed tickets.`
        });

    }
};