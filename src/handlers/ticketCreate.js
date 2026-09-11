const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require("discord.js");

const supabase = require("../database/supabase");

// Prevent the same interaction from being processed twice
const processingInteractions = new Set();

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("ticket_")) return;

    // Prevent duplicate handling of the same Discord interaction
    if (processingInteractions.has(interaction.id)) {
        console.log(
            `⚠️ Duplicate ticket interaction ignored: ${interaction.id}`
        );
        return;
    }

    processingInteractions.add(interaction.id);

    // Remove from memory after a short time
    setTimeout(() => {
        processingInteractions.delete(interaction.id);
    }, 15000);

    try {

        const buttonId = interaction.customId.replace(
            "ticket_",
            ""
        );

        // =========================
        // GET BUTTON
        // =========================

        const { data: button, error } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("id", buttonId)
            .single();

        if (error || !button) {

            if (!interaction.replied && !interaction.deferred) {

                return await interaction.reply({
                    content: "❌ Invalid ticket button.",
                    flags: MessageFlags.Ephemeral
                });

            }

            return;
        }

        // =========================
        // DISABLED
        // =========================

        if (button.disabled === true) {

            if (!interaction.replied && !interaction.deferred) {

                return await interaction.reply({
                    content:
                        "❌ This ticket category is currently closed.",
                    flags: MessageFlags.Ephemeral
                });

            }

            return;
        }

        // =========================
        // QUESTIONS
        // =========================

        const {
            data: questions,
            error: questionError
        } = await supabase
            .from("ticket_questions")
            .select("*")
            .eq("button_id", button.id)
            .order("question_order");

        if (questionError) {
            console.error(
                "QUESTION ERROR:",
                questionError
            );
        }

        // =========================
        // SHOW MODAL
        // =========================

        if (questions && questions.length > 0) {

            const modalQuestions = questions.slice(0, 5);

            const modal = new ModalBuilder()
                .setCustomId(
                    `ticket_modal_${button.id}`
                )
                .setTitle(
                    String(button.label).length > 45
                        ? String(button.label).substring(0, 42) + "..."
                        : String(button.label)
                );

            for (const q of modalQuestions) {

                const question = String(
                    q.question || "Question"
                );

                const label =
                    question.length > 45
                        ? question.substring(0, 42) + "..."
                        : question;

                const placeholder =
                    question.length > 100
                        ? question.substring(0, 97) + "..."
                        : question;

                const input = new TextInputBuilder()
                    .setCustomId(
                        `q${q.question_order}`
                    )
                    .setLabel(label)
                    .setPlaceholder(placeholder)
                    .setRequired(true)
                    .setStyle(
                        q.input_type === "paragraph"
                            ? TextInputStyle.Paragraph
                            : TextInputStyle.Short
                    );

                modal.addComponents(
                    new ActionRowBuilder()
                        .addComponents(input)
                );
            }

            // IMPORTANT:
            // Do NOT deferReply() or reply() before showModal()
            return await interaction.showModal(modal);
        }

        // =========================
        // DEFER
        // =========================

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // =========================
        // SETTINGS
        // =========================

        const {
            data: settings,
            error: settingsError
        } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (
            settingsError &&
            settingsError.code !== "PGRST116"
        ) {
            console.error(
                "SETTINGS ERROR:",
                settingsError
            );
        }

        // =========================
        // BLACKLIST
        // =========================

        if (
            settings?.blacklist_role &&
            interaction.guild.roles.cache.has(
                String(settings.blacklist_role)
            ) &&
            interaction.member.roles.cache.has(
                String(settings.blacklist_role)
            )
        ) {

            return await interaction.editReply({
                content:
                    "❌ You are blacklisted from creating tickets."
            });
        }

        // =========================
        // COUNTER
        // =========================

        const {
            data: counter,
            error: counterError
        } = await supabase
            .from("ticket_counter")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (
            counterError &&
            counterError.code !== "PGRST116"
        ) {
            console.error(
                "COUNTER ERROR:",
                counterError
            );
        }

        let number = 1;

        if (counter) {

            number = Number(counter.current) + 1;

            const { error: updateError } =
                await supabase
                    .from("ticket_counter")
                    .update({
                        current: number
                    })
                    .eq(
                        "guild_id",
                        interaction.guild.id
                    );

            if (updateError) {
                console.error(
                    "COUNTER UPDATE ERROR:",
                    updateError
                );
            }

        } else {

            const { error: insertError } =
                await supabase
                    .from("ticket_counter")
                    .insert({
                        guild_id:
                            interaction.guild.id,
                        current: 1
                    });

            if (insertError) {
                console.error(
                    "COUNTER INSERT ERROR:",
                    insertError
                );
            }
        }

        // =========================
        // CHANNEL NAME
        // =========================

        let cleanName = String(button.label || "ticket")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (!cleanName) {
            cleanName = "ticket";
        }

        cleanName = cleanName.substring(0, 70);

        const ticketName =
            `${cleanName}-${String(number).padStart(4, "0")}`;

        // =========================
        // PERMISSIONS
        // =========================

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

        // =========================
        // STAFF ROLES
        // =========================

        if (Array.isArray(settings?.staff_roles)) {

            for (const roleId of settings.staff_roles) {

                const id = String(roleId).trim();

                if (!/^\d+$/.test(id)) {
                    console.log(
                        `⚠️ Invalid staff role ID: ${id}`
                    );
                    continue;
                }

                const role =
                    interaction.guild.roles.cache.get(id);

                if (!role) {

                    console.log(
                        `⚠️ Skipping missing staff role: ${id}`
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
            }
        }

        // =========================
        // CREATE CHANNEL
        // =========================

        const channel =
            await interaction.guild.channels.create({

                name: ticketName,

                type: ChannelType.GuildText,

                parent: button.category_id,

                topic: interaction.user.id,

                permissionOverwrites: overwrites

            });

        // =========================
        // EMBED
        // =========================

        const embed = new EmbedBuilder()

            .setColor(
                settings?.embed_color || "#e11d48"
            )

            .setAuthor({

                name:
                    interaction.guild.name,

                iconURL:
                    interaction.guild.iconURL({
                        dynamic: true
                    }) || undefined

            })

            .setTitle("🎫 Support Ticket")

            .setDescription(
`Hey ${interaction.user}, thanks for opening a ticket. A staff member will be with you shortly.

**Opened By:** ${interaction.user}
**Category:** ${button.label}`
            )

            .setFooter({
                text:
                    `Ticket #${String(number).padStart(4, "0")}`
            })

            .setTimestamp();

        // =========================
        // BUTTONS
        // =========================

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId("claim")
                        .setLabel("Claim")
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId("close")
                        .setLabel("Close")
                        .setStyle(
                            ButtonStyle.Danger
                        )

                );

        // =========================
        // SEND MESSAGE
        // =========================

        await channel.send({

            content:
                `<@${interaction.user.id}>`,

            embeds: [
                embed
            ],

            components: [
                row
            ]

        });

        // =========================
        // SAVE TICKET
        // =========================

        const {
            error: ticketError
        } = await supabase
            .from("tickets")
            .insert({

                guild_id:
                    interaction.guild.id,

                channel_id:
                    channel.id,

                owner_id:
                    interaction.user.id,

                category:
                    button.label,

                claimed_by:
                    null,

                status:
                    "open"

            });

        if (ticketError) {

            console.error(
                "TICKET DATABASE ERROR:",
                ticketError
            );

        }

        // =========================
        // SUCCESS
        // =========================

        return await interaction.editReply({

            content:
                `✅ Ticket Created: ${channel}`

        });

    } catch (error) {

        console.error(
            "TICKET CREATE ERROR:",
            error
        );

        if (
            interaction.deferred ||
            interaction.replied
        ) {

            return await interaction.editReply({

                content:
                    `❌ Something went wrong while creating the ticket.\n\`${error.message}\``

            }).catch(() => {});

        }

        return await interaction.reply({

            content:
                `❌ Something went wrong while creating the ticket.\n\`${error.message}\``,

            flags:
                MessageFlags.Ephemeral

        }).catch(() => {});

    }
};