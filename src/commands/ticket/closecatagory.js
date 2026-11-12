const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("closecategory")
        .setDescription("Close a ticket category.")

        .addStringOption(option =>
            option
                .setName("category")
                .setDescription("Category name")
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {

        const { data: buttons } = await supabase
            .from("ticket_buttons")
            .select("label")
            .eq("guild_id", interaction.guild.id);

        const focused = interaction.options.getFocused();

        const choices = buttons
            .filter(x => x.label.toLowerCase().includes(focused.toLowerCase()))
            .map(x => ({
                name: x.label,
                value: x.label
            }));

        await interaction.respond(choices.slice(0, 25));

    },

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const category = interaction.options.getString("category");

        const { error } = await supabase
            .from("ticket_buttons")
            .update({
                disabled: true
            })
            .eq("guild_id", interaction.guild.id)
            .eq("label", category);

        if (error) {

            console.log(error);

            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Failed to close category."
            });

        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> **${category}** has been closed.`
        });

    }
};