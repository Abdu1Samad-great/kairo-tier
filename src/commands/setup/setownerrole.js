const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("setownerrole")
        .setDescription("Set the ticket owner role.")

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
                content: "<:Cross:1558553359642918952> Failed to save owner role."
            });
        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Owner role set to ${role}.`
        });

    }
};