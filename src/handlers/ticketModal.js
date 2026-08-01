const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");

const supabase = require("../database/supabase");

module.exports = async (interaction) => {

    if (!interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("ticket_modal_")) return;


    await interaction.deferReply({
        flags: 64
    });


    const buttonId = interaction.customId.replace("ticket_modal_", "");


    const { data: button } = await supabase
        .from("ticket_buttons")
        .select("*")
        .eq("id", buttonId)
        .single();


    if (!button) {
        return interaction.editReply({
            content: "❌ Invalid ticket button."
        });
    }


    const { data: settings } = await supabase
        .from("ticket_settings")
        .select("*")
        .eq("guild_id", interaction.guild.id)
        .single();



    const { data: counter } = await supabase
        .from("ticket_counter")
        .select("*")
        .eq("guild_id", interaction.guild.id)
        .single();


    let number = 1;


    if (counter) {

        number = counter.current + 1;

        await supabase
            .from("ticket_counter")
            .update({
                current: number
            })
            .eq("guild_id", interaction.guild.id);

    } else {

        await supabase
            .from("ticket_counter")
            .insert({
                guild_id: interaction.guild.id,
                current: 1
            });

    }



    const ticketName =
        `${button.label.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")}-${String(number).padStart(4,"0")}`;



    const overwrites = [

        {
            id: interaction.guild.roles.everyone,
            deny: [
                PermissionFlagsBits.ViewChannel
            ]
        },

        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        }

    ];



    if (Array.isArray(settings?.staff_roles)) {

        for (const role of settings.staff_roles) {

            overwrites.push({
                id: role,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            });

        }

    }



    const channel = await interaction.guild.channels.create({

        name: ticketName,

        type: ChannelType.GuildText,

        parent: button.category_id,

        topic: interaction.user.id,

        permissionOverwrites: overwrites

    });



let answers = "";

const { data: questions } = await supabase
    .from("ticket_questions")
    .select("*")
    .eq("button_id", button.id)
    .order("question_order");


if (questions && questions.length > 0) {

    for (const q of questions) {

        const value = interaction.fields.getTextInputValue(
            `q${q.question_order}`
        );

        answers += `\n**${q.question}:** ${value}`;

    }

}



    const embed = new EmbedBuilder()

        .setColor("#e11d48")

        .setTitle("🎫 Support Ticket")

        .setDescription(
`Welcome ${interaction.user}

Category:
**${button.label}**

${answers}`
        );



    const row = new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()
                .setCustomId("claim")
                .setLabel("Claim")
                .setStyle(ButtonStyle.Success),


            new ButtonBuilder()
                .setCustomId("close")
                .setLabel("Close")
                .setStyle(ButtonStyle.Danger)

        );



    await channel.send({

        content: `<@${interaction.user.id}>`,

        embeds: [embed],

        components: [row]

    });



    await supabase
        .from("tickets")
        .insert({

            guild_id: interaction.guild.id,

            channel_id: channel.id,

            owner_id: interaction.user.id,

            category: button.label,

            claimed_by: null,

            status: "open"

        });



    return interaction.editReply({

        content: `✅ Ticket Created: ${channel}`

    });

};