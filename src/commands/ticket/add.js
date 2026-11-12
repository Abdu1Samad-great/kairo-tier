const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "staff",
    data: new SlashCommandBuilder()
        .setName("add")
        .setDescription("Add a user to the current ticket.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to add")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        try {


            const { data: ticket, error: ticketError } = await supabase
                .from("tickets")
                .select("*")
                .eq("channel_id", interaction.channel.id)
                .single();

            if (ticketError || !ticket) {
                return interaction.editReply({
                    content: "<:Cross:1558553359642918952> This command can only be used inside a ticket."
                });
            }


            const { data: settings, error: settingsError } = await supabase
                .from("ticket_settings")
                .select("*")
                .eq("guild_id", interaction.guild.id)
                .single();

            if (settingsError || !settings) {
                return interaction.editReply({
                    content: "<:Cross:1558553359642918952> Ticket system is not configured."
                });
            }

            // GET USER

            const user = interaction.options.getUser("user");


            const perms = interaction.channel.permissionsFor(user.id);

            if (
                perms &&
                perms.has(PermissionFlagsBits.ViewChannel)
            ) {
                return interaction.editReply({
                    content: `<:Cross:1558553359642918952> ${user} is already in this ticket.`
                });
            }


            await interaction.channel.permissionOverwrites.edit(
                user.id,
                {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                }
            );


            const vc = interaction.guild.channels.cache.find(
                channel =>
                    channel.parentId === interaction.channel.parentId &&
                    channel.name === interaction.channel.name &&
                    channel.isVoiceBased()
            );

            if (vc) {
                await vc.permissionOverwrites.edit(
                    user.id,
                    {
                        ViewChannel: true,
                        Connect: true,
                        Speak: true
                    }
                );
            }

            // SUCCESS

            return interaction.editReply({
                content: `<:tick:1558554326887047228> ${user} has been added to this ticket.`
            });

        } catch (error) {

            console.error("ADD COMMAND ERROR:", error);

            return interaction.editReply({
                content:
                    `<:Cross:1558553359642918952> Something went wrong.\n\`${error.message}\``
            }).catch(() => {});

        }
    }
};
