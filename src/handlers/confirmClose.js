const supabase = require("../database/supabase");
const { MessageFlags } = require("discord.js");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "confirm_close") return;

    const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", interaction.channel.id)
        .single();

    if (!ticket) {
        return interaction.reply({
            content: "❌ Ticket not found.",
            flags: MessageFlags.Ephemeral
        });
    }

    if (!ticket.close_requested_by) {
        const owner = ticket.claimed_by
            ? `<@${ticket.claimed_by}>`
            : "a staff member";

        return interaction.reply({
            content: `❌ Only ${owner} can confirm this ticket closure.`,
            flags: MessageFlags.Ephemeral
        });
    }

    if (ticket.close_requested_by !== interaction.user.id) {
        return interaction.reply({
            content: `❌ Only <@${ticket.close_requested_by}> can confirm this ticket closure.`,
            flags: MessageFlags.Ephemeral
        });
    }

    await supabase
        .from("tickets")
        .update({
            close_requested_by: null
        })
        .eq("channel_id", interaction.channel.id);

    await interaction.update({
        content: "🔒 Ticket will be closed in **5 seconds...**",
        embeds: [],
        components: []
    });

    setTimeout(async () => { 
                const { data: settings } = await supabase
            .from("ticket_settings")
            .select("closed_category")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (!settings?.closed_category) return;

        // Move ticket
        await interaction.channel.setParent(settings.closed_category);

        // Rename ticket
        await interaction.channel.setName(
            `closed-${interaction.channel.name.replace(/^closed-/, "")}`
        );

        // Lock ticket for owner
        if (ticket.owner_id) {
            await interaction.channel.permissionOverwrites.edit(ticket.owner_id, {
                SendMessages: false
            });
        }

        // Update database
        await supabase
            .from("tickets")
            .update({
                status: "closed"
            })
            .eq("channel_id", interaction.channel.id);

        await interaction.channel.send({
            embeds: [
                {
                    color: 0xff0000,
                    title: "🔒 Ticket Closed",
                    description: `This ticket has been closed by <@${interaction.user.id}>.`
                }
            ]
        });

    }, 5000);

};