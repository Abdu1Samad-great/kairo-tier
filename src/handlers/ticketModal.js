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

    try {

        await interaction.deferReply({
            flags: 64
        });

        const buttonId = interaction.customId.replace(
            "ticket_modal_",
            ""
        );

        const { data: button, error: buttonError } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("id", buttonId)
            .single();

        if (buttonError) {
            console.error("BUTTON DATABASE ERROR:", buttonError);

            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Failed to load ticket button."
            });
        }

        if (!button) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Invalid ticket button."
            });
        }

        const { data: settings, error: settingsError } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (settingsError && settingsError.code !== "PGRST116") {
            console.error("SETTINGS DATABASE ERROR:", settingsError);
        }

        const { data: counter, error: counterError } = await supabase
            .from("ticket_counter")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (counterError && counterError.code !== "PGRST116") {
            console.error("COUNTER DATABASE ERROR:", counterError);
        }

        let number = 1;

        if (counter) {

            number = Number(counter.current) + 1;

            const { error } = await supabase
                .from("ticket_counter")
                .update({
                    current: number
                })
                .eq("guild_id", interaction.guild.id);

            if (error) {
                console.error("COUNTER UPDATE ERROR:", error);
            }

        } else {

            const { error } = await supabase
                .from("ticket_counter")
                .insert({
                    guild_id: interaction.guild.id,
                    current: 1
                });

            if (error) {
                console.error("COUNTER INSERT ERROR:", error);
            }
        }

        const ticketName =
            `${button.label
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
            }-${String(number).padStart(4, "0")}`;

        const overwrites = [

            {
                id: interaction.guild.roles.everyone.id,

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

                try {

                    const role = await interaction.guild.roles.fetch(
                        String(roleId)
                    );

                    if (!role) {
                        console.log(
                            `Staff role not found: ${roleId}`
                        );

                        continue;
                    }

                    overwrites.push({

                        id: role.id,

                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]

                    });

                } catch (error) {

                    console.error(
                        `FAILED TO FETCH STAFF ROLE ${roleId}:`,
                        error
                    );

                }
            }
        }

        const channel = await interaction.guild.channels.create({

            name: ticketName,

            type: ChannelType.GuildText,

            parent: button.category_id,

            topic: interaction.user.id,

            permissionOverwrites: overwrites

        });

        const { data: questions, error: questionsError } =
            await supabase
                .from("ticket_questions")
                .select("*")
                .eq("button_id", button.id)
                .order("question_order");

        if (questionsError) {
            console.error(
                "QUESTIONS DATABASE ERROR:",
                questionsError
            );
        }

        let answers = "";

        if (questions && questions.length > 0) {

            for (const q of questions) {

                let value = "Not provided";

                try {

                    value = interaction.fields.getTextInputValue(
                        `q${q.question_order}`
                    );

                } catch {

                    value = "Not provided";

                }

                answers +=
                    `**${q.question}**\n${value}\n\n`;
            }
        }

        const embed = new EmbedBuilder()

            .setColor(
                settings?.embed_color || "#e11d48"
            )

            .setAuthor({
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL({
                    dynamic: true
                }) || undefined
            })

            .setTitle("<:forensic:1563646085971583006> Support Ticket")

            .setDescription(
                `Hey ${interaction.user}, thanks for opening a ticket. A staff member will be with you shortly.

**Opened By:** ${interaction.user}
**Category:** ${button.label}

### Submitted Information

${answers || "No information provided."}`
            )

            .setFooter({
                text: `Ticket #${String(number).padStart(4, "0")}`
            })

            .setTimestamp();

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

            embeds: [
                embed
            ],

            components: [
                row
            ]

        });

        const { error: ticketError } = await supabase
            .from("tickets")
            .insert({

                guild_id: interaction.guild.id,

                channel_id: channel.id,

                owner_id: interaction.user.id,

                category: button.label,

                claimed_by: null,

                status: "open"

            });

        if (ticketError) {

            console.error(
                "TICKET DATABASE ERROR:",
                ticketError
            );

            return interaction.editReply({

                content:
                    `<:Poll:1552279014767591516> Ticket created: ${channel}\n` +
                    `However, there was an error saving it to the database.`

            });
        }

        // Success
        return interaction.editReply({

            content:
                `<:tick:1558554326887047228> Ticket Created: ${channel}`

        });

    } catch (error) {

        console.error(
            "TICKET CREATE ERROR:",
            error
        );

        // If interaction was already acknowledged,
        // don't attempt another initial reply.
        if (interaction.deferred || interaction.replied) {

            try {

                await interaction.editReply({
                    content:
                        "<:Cross:1558553359642918952> An error occurred while creating the ticket."
                });

            } catch (editError) {

                console.error(
                    "FAILED TO EDIT ERROR REPLY:",
                    editError
                );

            }

        } else {

            try {

                await interaction.reply({

                    content:
                        "<:Cross:1558553359642918952> An error occurred while creating the ticket.",

                    flags: 64

                });

            } catch (replyError) {

                console.error(
                    "FAILED TO SEND ERROR REPLY:",
                    replyError
                );

            }
        }
    }
};
