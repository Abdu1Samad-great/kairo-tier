    const {
        SlashCommandBuilder,
        PermissionFlagsBits
    } = require("discord.js");

    const supabase = require("../../database/supabase");

    module.exports = {
        data: new SlashCommandBuilder()
            .setName("setstaffrole")
            .setDescription("Set the staff role for tickets.")
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

            .addStringOption(option =>
        option
            .setName("action")
            .setDescription("Add or Remove a staff role")
            .setRequired(true)
            .addChoices(
                { name: "Add", value: "add" },
                { name: "Remove", value: "remove" },
                { name: "List", value: "list" }
            )
    )

            .addRoleOption(option =>
                option
                    .setName("role")
                    .setDescription("Staff Role")
                    .setRequired(false)
            ),

        async execute(interaction) {

            await interaction.deferReply({ ephemeral: true });

            const action = interaction.options.getString("action");
    const role = interaction.options.getRole("role");

            const { data: settings } = await supabase
                .from("ticket_settings")
                .select("*")
                .eq("guild_id", interaction.guild.id)
                .single();

            if (!settings) {

                return interaction.editReply({
                    content: "❌ Run /setupticket first."
                });

            }

let roles = settings.staff_roles;

if (!roles) {
    roles = [];
} else if (typeof roles === "string") {
    try {
        roles = JSON.parse(roles);
    } catch {
        roles = [];
    }
} else if (!Array.isArray(roles)) {
    roles = [];
}

    if (action === "list") {

        if (roles.length === 0) {
            return interaction.editReply({
                content: "❌ No staff roles have been added."
            });
        }

        return interaction.editReply({
            content: roles.map(id => `<@&${id}>`).join("\n")
        });

    }

    if (!role) {
        return interaction.editReply({
            content: "❌ Please select a role."
        });
    }

    if (action === "add") {

        if (roles.includes(role.id)) {
            return interaction.editReply({
                content: "❌ This role is already a staff role."
            });
        }

        roles.push(role.id);

    } else if (action === "remove") {

        roles = roles.filter(id => id !== role.id);

    }

    const { error } = await supabase
        .from("ticket_settings")
        .update({
            staff_roles: roles
        })
        .eq("guild_id", interaction.guild.id);

    if (error) {
        console.log(error);

        return interaction.editReply({
            content: "❌ Failed to update staff roles."
        });
    }

    return interaction.editReply({
        content: "✅ Staff roles updated successfully."
    });

        }
    };