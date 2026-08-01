const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rename")
        .setDescription("Rename the current ticket.")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("New ticket name")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Check ticket
        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "❌ This is not a ticket."
            });
        }

        // Owner Role Check
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (
            !settings?.owner_role ||
            !interaction.member.roles.cache.has(settings.owner_role)
        ) {
            return interaction.editReply({
                content: "❌ Only the Owner Role can use this command."
            });
        }

        let newName = interaction.options.getString("name")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

        // Keep ticket number
        const match = interaction.channel.name.match(/(\d+)$/);

        if (match) {
            newName += `-${match[1]}`;
        }

        await interaction.channel.setName(newName);

        return interaction.editReply({
            content: `✅ Ticket renamed to **${newName}**`
        });

    }
};