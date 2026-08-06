const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View all available commands."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("embed_color")
            .eq("guild_id", interaction.guild.id)
            .single();

        const embed = new EmbedBuilder()
            .setColor(settings?.embed_color || "#e11d48")
            .setTitle("📚 Kairo Tickets Help")
            .setDescription("Below is a list of all available commands.")

            .addFields(

                {
                    name: "🎫 Ticket Management",
 value: `
/add — Add a user to the current ticket.
/addrole — Add a role to the current ticket.
/remove — Remove a user from the current ticket.
/removerole — Remove a role from the current ticket.
/rename — Rename the current ticket.
/open — Reopen a closed ticket.
/delete — Permanently delete the current ticket.
/purge — Generate a transcript and permanently delete the current ticket.
`
                },

                {
                    name: "📂 Ticket Categories",
                    value:
                    "`/opencategory` — Open a ticket category.\n" +
                    "`/closecategory` — Close a ticket category.\n" +
                    "`/setcloseticketchannel` — Set the category where closed tickets are moved."
                },

                {
                    name: "📝 Ticket Panels",
                    value:
                    "`/setupticket` — Send the ticket panel.\n" +
                    "`/addbutton` — Add a ticket button.\n" +
                    "`/removebutton` — Remove a ticket button.\n" +
                    "`/editheader` — Edit the ticket panel header.\n" +
                    "`/editdescription` — Edit the ticket panel description.\n" +
                    "`/resendpanel` — Resend the panel.\n" +
                    "`/resetpanel` — Reset the current panel."
                },

                {
                    name: "🎤 Voice Channels",
                    value:
                    "`/createvc` — Create a voice channel for the current ticket.\n" +
                    "`/deletevc` — Delete the ticket voice channel."
                },

                {
                    name: "🗑️ Bulk Actions",
                    value:
                    "`/deleteall` — Delete all closed tickets.\n" +
                    "`/purgeall` — Generate transcripts and permanently delete all closed tickets."
                },

                {
                    name: "👮 Roles & Permissions",
                    value:
                    "`/setadminrole` — Set the Admin role.\n" +
                    "`/setstaffrole` — Set the Staff role.\n" +
                    "`/setownerrole` — Set the Owner role.\n" +
                    "`/setblacklistrole` — Set the Blacklist role."
                },

                {
                    name: "⚙️ Configuration",
                    value:
                    "`/settranscriptchannel` — Set the transcript channel.\n" +
                    "`/embedcolor` — Change the embed color."
                }

            )

            .setFooter({
                text: "Kairo Tickets • Professional Ticket System"
            })
            .setTimestamp();

        return interaction.editReply({
            embeds: [embed]
        });

    }

};