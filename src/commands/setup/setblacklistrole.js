const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("setblacklistrole")
        .setDescription("Set the role that cannot create tickets.")

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
                content: "<:Cross:1558553359642918952> Failed to save blacklist role."
            });
        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Blacklist role set to ${role}.`
        });

    }
};