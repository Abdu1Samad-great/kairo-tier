const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a user from the current ticket.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to remove")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        // Check ticket
        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a ticket."
            });
        }

        // Get settings
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (!settings) {
            return interaction.editReply({
                content: "❌ Ticket system is not configured."
            });
        }

        // Staff Check
        if (!interaction.member.roles.cache.has(settings.staff_role)) {
            return interaction.editReply({
                content: "❌ You don't have permission to use this command."
            });
        }

        const user = interaction.options.getUser("user");

        // Don't remove ticket owner
        if (user.id === ticket.owner_id) {
            return interaction.editReply({
                content: "❌ You cannot remove the ticket owner."
            });
        }

        // Remove from text channel
        await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});

        // Remove from VC if exists
        const vc = interaction.guild.channels.cache.find(
            c =>
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name &&
                c.isVoiceBased()
        );

        if (vc) {
            await vc.permissionOverwrites.delete(user.id).catch(() => {});
        }

        return interaction.editReply({
            content: `✅ ${user} has been removed from this ticket.`
        });

    }
};