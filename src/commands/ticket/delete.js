const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Delete a ticket permanently."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Ticket check
        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "❌ This is not a ticket."
            });
        }

        // Owner Role Check
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role")
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

        // Delete linked VC
        const vc = interaction.guild.channels.cache.find(
            c =>
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name &&
                c.isVoiceBased()
        );

        if (vc) {
            await vc.delete().catch(() => {});
        }

        // Remove database
        await supabase
            .from("tickets")
            .delete()
            .eq("channel_id", interaction.channel.id);

        await interaction.editReply({
            content: "✅ Ticket deleted."
        });

        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 1000);

    }
};