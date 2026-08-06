const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("open")
        .setDescription("Reopen a closed ticket.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

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

        if (ticket.status !== "closed") {
            return interaction.editReply({
                content: "❌ This ticket is not closed."
            });
        }

        // Move back
        await interaction.channel.setParent(ticket.original_category);

        // Rename
        await interaction.channel.setName(
            interaction.channel.name.replace(/^closed-/, "")
        );

        // Give owner send permission
        await interaction.channel.permissionOverwrites.edit(ticket.owner_id, {
            SendMessages: true,
            ViewChannel: true,
            ReadMessageHistory: true
        });

// Update DB
await supabase
    .from("tickets")
    .update({
        status: "open",
        close_requested_by: null
    })
    .eq("channel_id", interaction.channel.id);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🔓 Ticket Reopened")
            .setDescription(`This ticket has been reopened by ${interaction.user}.`);

        await interaction.channel.send({
            embeds: [embed]
        });

        return interaction.editReply({
            content: "✅ Ticket reopened."
        });

    }
};