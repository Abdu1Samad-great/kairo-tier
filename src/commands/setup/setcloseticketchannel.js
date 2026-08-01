const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setcloseticketchannel")
        .setDescription("Set the category where closed tickets will be moved.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

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
                content: "❌ Failed to save closed ticket category."
            });
        }

        return interaction.editReply({
            content: `✅ Closed ticket category set to **${category.name}**`
        });

    }
};