const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setblacklistrole")
        .setDescription("Set the role that cannot create tickets.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Blacklist Role")
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
                blacklist_role: role.id
            })
            .eq("guild_id", interaction.guild.id);

        if (error) {
            console.log(error);

            return interaction.editReply({
                content: "❌ Failed to save blacklist role."
            });
        }

        return interaction.editReply({
            content: `✅ Blacklist role set to ${role}.`
        });

    }
};