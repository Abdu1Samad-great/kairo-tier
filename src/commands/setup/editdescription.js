const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const supabase = require("../../database/supabase");
const updatePanel = require("../../utils/panelManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("editdescription")
        .setDescription("Edit the ticket panel description.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("New description (use /n for a new line)")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const text = interaction.options.getString("text");
        const parsedText = text.replace(/\/n/g, "\n");

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

        await supabase
            .from("ticket_settings")
            .update({
                description: parsedText
            })
            .eq("guild_id", interaction.guild.id);

        // Update whole panel
        await updatePanel(interaction.guild);

        return interaction.editReply({
            content: "✅ Description updated successfully."
        });

    }
};