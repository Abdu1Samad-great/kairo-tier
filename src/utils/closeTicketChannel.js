const supabase = require("../database/supabase");

async function closeTicketChannel(channel, guild, ticket, closerId) {
    const { data: settings } = await supabase
        .from("ticket_settings")
        .select("closed_category")
        .eq("guild_id", guild.id)
        .single();

    if (settings?.closed_category) {
        await channel.setParent(settings.closed_category).catch(() => {});
    }

    await channel.setName(`closed-${String(channel.name).replace(/^closed-/, "")}`).catch(() => {});

    if (ticket?.owner_id) {
        await channel.permissionOverwrites.edit(ticket.owner_id, {
            SendMessages: false,
            ViewChannel: true,
            ReadMessageHistory: true,
        }).catch(() => {});
    }

    await supabase
        .from("tickets")
        .update({
            status: "closed",
            close_requested_by: null,
        })
        .eq("channel_id", channel.id);

    await channel.send({
        embeds: [
            {
                color: 0xff0000,
                title: "Ticket Closed",
                description: `This ticket has been closed by <@${closerId}>.`,
            },
        ],
    }).catch(() => {});
}

module.exports = closeTicketChannel;