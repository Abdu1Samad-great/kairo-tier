const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setadminrole")
        .setDescription("Set the admin role.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Admin Role")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const role = interaction.options.getRole("role");

        const { error } = await supabase
            .from("ticket_settings")
            .update({
                admin_role: role.id
            })
            .eq("guild_id", interaction.guild.id);

        if (error) {
            console.log(error);

            return interaction.editReply({
                content: "❌ Failed to save admin role."
            });
        }

        return interaction.editReply({
            content: `✅ Admin role set to ${role}.`
        });

    }
};