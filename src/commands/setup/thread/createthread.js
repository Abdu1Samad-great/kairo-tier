const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("createthread")
        .setDescription("Create a private thread inside the current ticket.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)

        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("Thread name")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Must be inside a ticket
        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a ticket."
            });
        }

        const threadName = interaction.options.getString("name");

        // Create Private Thread
        const thread = await interaction.channel.threads.create({

            name: threadName,

            type: ChannelType.PrivateThread,

            autoArchiveDuration: 1440,

            reason: `Created by ${interaction.user.tag}`

        });

        // Add command user
        await thread.members.add(interaction.user.id).catch(() => {});

        // Add ticket owner
        if (ticket.owner_id) {

            await thread.members
                .add(ticket.owner_id)
                .catch(() => {});

        }

        // Get Settings
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("staff_roles")
            .eq("guild_id", interaction.guild.id)
            .single();

                // Add every staff member

        if (settings?.staff_roles && Array.isArray(settings.staff_roles)) {

            for (const roleId of settings.staff_roles) {

                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) continue;

                for (const member of role.members.values()) {

                    if (member.user.bot) continue;

                    try {

                        await thread.members.add(member.id);

                    } catch (err) {

                        console.log(
                            `Failed to add ${member.user.tag} to thread.`
                        );

                    }

                }

            }

        }

        await interaction.editReply({

            content:
`✅ Private thread created successfully.

🧵 Thread: ${thread}
👤 Ticket Owner Added
👥 Staff Members Added`

        });

    }

};