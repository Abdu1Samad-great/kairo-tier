const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setupticket")
        .setDescription("Setup the ticket panel.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Channel where the ticket panel will be sent")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const channel = interaction.options.getChannel("channel");

        try {

            const { data: existing, error } = await supabase
                .from("ticket_settings")
                .select("*")
                .eq("guild_id", interaction.guild.id)
                .single();


            if (error && error.code !== "PGRST116") {

                console.log(error);

                return interaction.editReply({
                    content: "❌ Database error."
                });

            }


            // Check if old panel exists
            if (existing?.message_id) {

                const oldChannel = interaction.guild.channels.cache.get(
                    existing.panel_channel
                );


                if (oldChannel) {

                    try {

                        await oldChannel.messages.fetch(existing.message_id);


                        return interaction.editReply({
                            content: "❌ A ticket panel already exists in this server."
                        });


                    } catch {

                        console.log(
                            "Old panel deleted. Creating a new one..."
                        );

                    }

                }

            }



            const embed = new EmbedBuilder()
                .setColor(existing?.embed_color || "#e11d48")
                .setTitle("🎫 Support Center")
                .setDescription(
                    "Need help?\n\nChoose a category below."
                );



            const row = new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId("ticket_general")
                        .setLabel("General Support")
                        .setStyle(ButtonStyle.Primary)

                );



            const panel = await channel.send({

                embeds: [embed],

                components: [row]

            });



            if (existing) {


                const { error: updateError } = await supabase
                    .from("ticket_settings")
                    .update({

                        panel_channel: channel.id,
                        message_id: panel.id,
                        header: "Support Center",
                        description: "Need help?\n\nChoose a category below."

                    })
                    .eq("guild_id", interaction.guild.id);



                if (updateError) {
                    console.log(updateError);
                }


            } else {


                const { error: insertError } = await supabase
                    .from("ticket_settings")
                    .insert({

                        guild_id: interaction.guild.id,
                        panel_channel: channel.id,
                        message_id: panel.id,
                        header: "Support Center",
                        description: "Need help?\n\nChoose a category below."

                    });



                if (insertError) {
                    console.log(insertError);
                }


            }



            return interaction.editReply({

                content: `✅ Ticket panel created successfully in ${channel}`

            });



        } catch (err) {


            console.error(err);



            return interaction.editReply({

                content: "❌ Something went wrong while creating the ticket panel."

            });


        }

    },
};