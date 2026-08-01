const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setownerrole")
        .setDescription("Set the ticket owner role.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Owner Role")
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
                owner_role: role.id
            })
            .eq("guild_id", interaction.guild.id);

        if (error) {
            console.log(error);

            return interaction.editReply({
                content: "❌ Failed to save owner role."
            });
        }

        return interaction.editReply({
            content: `✅ Owner role set to ${role}.`
        });

    }
};