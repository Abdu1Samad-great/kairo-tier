const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

const supabase = require("../database/supabase");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("ticket_")) return;

    const buttonId = interaction.customId.replace("ticket_", "");

    console.log("Button ID:", buttonId);


    const { data: button, error } = await supabase
        .from("ticket_buttons")
        .select("*")
        .eq("id", buttonId)
        .single();


    if (error || !button) {
        return interaction.reply({
            content: "❌ Invalid ticket button.",
            flags: 64
        });
    }


    // Check Dynamic Questions
    const { data: questions } = await supabase
        .from("ticket_questions")
        .select("*")
        .eq("button_id", button.id)
        .order("question_order");


    // If Questions Exist -> Show Modal
    if (questions && questions.length > 0) {

        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${button.id}`)
            .setTitle(button.label);


        for (const q of questions) {

            const input = new TextInputBuilder()
                .setCustomId(`q${q.question_order}`)
                .setLabel(q.question)
                .setRequired(true)
                .setStyle(
                    q.input_type === "paragraph"
                        ? TextInputStyle.Paragraph
                        : TextInputStyle.Short
                );


            modal.addComponents(
                new ActionRowBuilder().addComponents(input)
            );

        }


        return interaction.showModal(modal);

    }


    // Simple Ticket Creation Starts Here
    await interaction.deferReply({
        flags: 64
    });


    if (button.disabled === true) {
        return interaction.editReply({
            content: "❌ This ticket category is currently closed."
        });
    }


    const { data: settings } = await supabase
        .from("ticket_settings")
        .select("*")
        .eq("guild_id", interaction.guild.id)
        .single();



    if (
        settings?.blacklist_role &&
        interaction.member.roles.cache.has(settings.blacklist_role)
    ) {

        return interaction.editReply({
            content: "❌ You are blacklisted from creating tickets."
        });

    }



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
        `${button.label
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")}-${String(number).padStart(4, "0")}`;



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

        for (const roleId of settings.staff_roles) {

            overwrites.push({

                id: roleId,

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



    const ping = await channel.send({
        content: "@here"
    });


    await ping.delete().catch(() => {});



    const embed = new EmbedBuilder()

        .setColor("#e11d48")

        .setTitle("🎫 Support Ticket")

        .setDescription(
`Welcome ${interaction.user}

A staff member will assist you shortly.

Category:
**${button.label}**`
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