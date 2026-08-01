const {
    SlashCommandBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");
const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Generate transcript and permanently delete this ticket."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Get ticket
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

        // Get settings
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role, transcript_channel")
            .eq("guild_id", interaction.guild.id)
            .single();

        // Owner role check
        if (
            !settings?.owner_role ||
            !interaction.member.roles.cache.has(settings.owner_role)
        ) {
            return interaction.editReply({
                content: "❌ Only the configured Owner Role can use this command."
            });
        }

        // Generate transcript
        const transcript = await discordTranscripts.createTranscript(
            interaction.channel,
            {
                filename: `${interaction.channel.name}.html`,
                saveImages: true,
                poweredBy: false
            }
        );

        // Send transcript
        if (settings.transcript_channel) {

            const logChannel = interaction.guild.channels.cache.get(settings.transcript_channel);

            if (logChannel) {

                await logChannel.send({
                    content: `📄 Transcript for **${interaction.channel.name}**`,
                    files: [transcript]
                });

            }

        }

        // Delete linked VC
        const vc = interaction.guild.channels.cache.find(c =>
            c.parentId === interaction.channel.parentId &&
            c.name === interaction.channel.name &&
            c.type === ChannelType.GuildVoice
        );

        if (vc) {
            await vc.delete().catch(() => {});
        }

        // Remove from database
        await supabase
            .from("tickets")
            .delete()
            .eq("channel_id", interaction.channel.id);

        await interaction.editReply({
            content: "🗑️ Ticket purged. Transcript has been saved."
        });

        // Delete channel
        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 2000);

    }
};