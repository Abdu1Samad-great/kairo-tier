const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
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

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {

            // =========================
            // CHECK IF TICKET
            // =========================

            const { data: ticket, error: ticketError } = await supabase
                .from("tickets")
                .select("*")
                .eq("channel_id", interaction.channel.id)
                .single();

            if (ticketError || !ticket) {
                return interaction.editReply({
                    content: "❌ This command can only be used inside a ticket."
                });
            }

            // =========================
            // GET SETTINGS
            // =========================

            const { data: settings, error: settingsError } = await supabase
                .from("ticket_settings")
                .select("*")
                .eq("guild_id", interaction.guild.id)
                .single();

            if (settingsError || !settings) {
                return interaction.editReply({
                    content: "❌ Ticket system is not configured."
                });
            }

            // =========================
            // GET ROLE IDs
            // =========================

            let staffRoles = settings.staff_roles;

            if (!staffRoles) {
                staffRoles = [];
            } else if (typeof staffRoles === "string") {
                try {
                    staffRoles = JSON.parse(staffRoles);
                } catch {
                    staffRoles = [];
                }
            }

            if (!Array.isArray(staffRoles)) {
                staffRoles = [];
            }

            staffRoles = staffRoles.map(id => String(id));

            const ownerRole = settings.owner_role
                ? String(settings.owner_role)
                : null;

            const adminRole = settings.admin_role
                ? String(settings.admin_role)
                : null;

            // =========================
            // PERMISSION CHECK
            // =========================

            const memberRoles = interaction.member.roles.cache;

            const isOwner =
                ownerRole &&
                memberRoles.has(ownerRole);

            const isAdmin =
                adminRole &&
                memberRoles.has(adminRole);

            const isStaff =
                staffRoles.some(roleId =>
                    memberRoles.has(roleId)
                );

            // Allow Owner OR Admin OR Staff
            if (!isOwner && !isAdmin && !isStaff) {
                return interaction.editReply({
                    content: "❌ You don't have permission to use this command."
                });
            }

            // =========================
            // GET USER
            // =========================

            const user = interaction.options.getUser("user");

            // =========================
            // CHECK ALREADY HAS ACCESS
            // =========================

            const perms = interaction.channel.permissionsFor(user.id);

            if (
                perms &&
                perms.has(PermissionFlagsBits.ViewChannel)
            ) {
                return interaction.editReply({
                    content: `❌ ${user} is already in this ticket.`
                });
            }

            // =========================
            // ADD USER TO TICKET
            // =========================

            await interaction.channel.permissionOverwrites.edit(
                user.id,
                {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                }
            );

            // =========================
            // CHECK FOR VC
            // =========================

            const vc = interaction.guild.channels.cache.find(
                channel =>
                    channel.parentId === interaction.channel.parentId &&
                    channel.name === interaction.channel.name &&
                    channel.isVoiceBased()
            );

            if (vc) {
                await vc.permissionOverwrites.edit(
                    user.id,
                    {
                        ViewChannel: true,
                        Connect: true,
                        Speak: true
                    }
                );
            }

            // =========================
            // SUCCESS
            // =========================

            return interaction.editReply({
                content: `✅ ${user} has been added to this ticket.`
            });

        } catch (error) {

            console.error("ADD COMMAND ERROR:", error);

            return interaction.editReply({
                content:
                    `❌ Something went wrong.\n\`${error.message}\``
            }).catch(() => {});

        }
    }
};