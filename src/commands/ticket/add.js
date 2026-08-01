const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add")
        .setDescription("Add a user to the current ticket.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to add")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        // Check if this is a ticket
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

        // Staff role check
        if (!interaction.member.roles.cache.has(settings.staff_role)) {
            return interaction.editReply({
                content: "❌ You don't have permission to use this command."
            });
        }

        const user = interaction.options.getUser("user");

        // Already has access?
        const perms = interaction.channel.permissionsFor(user.id);

        if (perms && perms.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.editReply({
                content: "❌ That user is already in this ticket."
            });
        }

        // Give access
        await interaction.channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        // Give VC access if exists
        const vc = interaction.guild.channels.cache.find(
            c =>
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name &&
                c.isVoiceBased()
        );

        if (vc) {
            await vc.permissionOverwrites.edit(user.id, {
                ViewChannel: true,
                Connect: true,
                Speak: true
            });
        }

        return interaction.editReply({
            content: `✅ ${user} has been added to this ticket.`
        });

    }
};