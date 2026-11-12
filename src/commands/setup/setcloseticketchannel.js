const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("setcloseticketchannel")
        .setDescription("Set the category where closed tickets will be moved.")

        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription("Closed Ticket Category")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const category = interaction.options.getChannel("category");

        const { error } = await supabase
            .from("ticket_settings")
            .update({
                closed_category: category.id
            })
            .eq("guild_id", interaction.guild.id);

        if (error) {
            console.log(error);

            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Failed to save closed ticket category."
            });
        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Closed ticket category set to **${category.name}**`
        });

    }
};