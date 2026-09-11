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

        // Acknowledge the modal submission
        await interaction.deferReply({
            flags: 64
        });

        const buttonId = interaction.customId.replace(
            "ticket_modal_",
            ""
        );

        // Get ticket button
        const { data: button, error: buttonError } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("id", buttonId)
            .single();

        if (buttonError) {
            console.error("BUTTON DATABASE ERROR:", buttonError);

            return interaction.editReply({
                content: "❌ Failed to load ticket button."
            });
        }

        if (!button) {
            return interaction.editReply({
                content: "❌ Invalid ticket button."
            });
        }

        // Get guild settings
        const { data: settings, error: settingsError } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (settingsError && settingsError.code !== "PGRST116") {
            console.error("SETTINGS DATABASE ERROR:", settingsError);
        }

        // Get ticket counter
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

        // Create ticket name
        const ticketName =
            `${button.label
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
            }-${String(number).padStart(4, "0")}`;

        // Permission overwrites
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

        // Add staff roles
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

        // Create channel
        const channel = await interaction.guild.channels.create({

            name: ticketName,

            type: ChannelType.GuildText,

            parent: button.category_id,

            topic: interaction.user.id,

            permissionOverwrites: overwrites

        });

        // Get ticket questions
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

        // Build answers
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

        // Create embed
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

            .setTitle("🎫 Support Ticket")

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

        // Ticket buttons
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

        // Send ticket message
        await channel.send({

            content: `<@${interaction.user.id}>`,

            embeds: [
                embed
            ],

            components: [
                row
            ]

        });

        // Save ticket to database
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

            // Ticket was created but DB failed
            return interaction.editReply({

                content:
                    `⚠️ Ticket created: ${channel}\n` +
                    `However, there was an error saving it to the database.`

            });
        }

        // Success
        return interaction.editReply({

            content:
                `✅ Ticket Created: ${channel}`

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
                        "❌ An error occurred while creating the ticket."
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
                        "❌ An error occurred while creating the ticket.",

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