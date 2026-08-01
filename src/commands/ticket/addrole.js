const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addrole")
        .setDescription("Add a role to the current ticket.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role to add")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

        const role = interaction.options.getRole("role");

        await interaction.channel.permissionOverwrites.edit(role.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        // Give VC access if ticket VC exists
        const vc = interaction.guild.channels.cache.find(c =>
            c.parentId === interaction.channel.parentId &&
            c.name === interaction.channel.name &&
            c.type === ChannelType.GuildVoice
        );

        if (vc) {
            await vc.permissionOverwrites.edit(role.id, {
                ViewChannel: true,
                Connect: true,
                Speak: true
            });
        }

        return interaction.editReply({
            content: `✅ ${role} has been added to this ticket.`
        });

    }
};