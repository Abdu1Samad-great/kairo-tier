const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");
const updatePanel = require("../../utils/panelManager");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addbutton")
        .setDescription("Add a ticket button.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // REQUIRED OPTIONS FIRST
        .addStringOption(option =>
            option
                .setName("label")
                .setDescription("Button Label")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("style")
                .setDescription("Button Color")
                .setRequired(true)
                .addChoices(
                    { name: "Blue", value: "Primary" },
                    { name: "Grey", value: "Secondary" },
                    { name: "Green", value: "Success" },
                    { name: "Red", value: "Danger" }
                )
        )

        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription("Ticket Category")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )

        // OPTIONAL OPTIONS AFTER REQUIRED
        .addStringOption(option =>
            option
                .setName("question1")
                .setDescription("Question 1 (Optional)")
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("lines1")
                .setDescription("Question 1 Input Type")
                .setRequired(false)
                .addChoices(
                    { name: "Short", value: "short" },
                    { name: "Paragraph", value: "paragraph" }
                )
        )

        .addStringOption(option =>
            option
                .setName("question2")
                .setDescription("Question 2 (Optional)")
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("lines2")
                .setDescription("Question 2 Input Type")
                .setRequired(false)
                .addChoices(
                    { name: "Short", value: "short" },
                    { name: "Paragraph", value: "paragraph" }
                )
        )

        .addStringOption(option =>
            option
                .setName("question3")
                .setDescription("Question 3 (Optional)")
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("lines3")
                .setDescription("Question 3 Input Type")
                .setRequired(false)
                .addChoices(
                    { name: "Short", value: "short" },
                    { name: "Paragraph", value: "paragraph" }
                )
        )

        .addStringOption(option =>
            option
                .setName("question4")
                .setDescription("Question 4 (Optional)")
                .setRequired(false)
        )

        .addStringOption(option =>
            option
                .setName("lines4")
                .setDescription("Question 4 Input Type")
                .setRequired(false)
                .addChoices(
                    { name: "Short", value: "short" },
                    { name: "Paragraph", value: "paragraph" }
                )
        )

        .addStringOption(option =>
            option
                .setName("emoji")
                .setDescription("Emoji (Optional)")
                .setRequired(false)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const label = interaction.options.getString("label");
        const style = interaction.options.getString("style");
        const category = interaction.options.getChannel("category");
        const emoji = interaction.options.getString("emoji") || null;

        const question1 = interaction.options.getString("question1");
        const question2 = interaction.options.getString("question2");
        const question3 = interaction.options.getString("question3");
        const question4 = interaction.options.getString("question4");

        const lines1 = interaction.options.getString("lines1") || "short";
        const lines2 = interaction.options.getString("lines2") || "short";
        const lines3 = interaction.options.getString("lines3") || "short";
        const lines4 = interaction.options.getString("lines4") || "short";

        const questions = [];

        if (question1) questions.push({ question: question1, type: lines1 });
        if (question2) questions.push({ question: question2, type: lines2 });
        if (question3) questions.push({ question: question3, type: lines3 });
        if (question4) questions.push({ question: question4, type: lines4 });


        const { data: buttons, error } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("guild_id", interaction.guild.id);


        if (error) {
            console.log(error);
            return interaction.editReply({
                content: "❌ Database Error."
            });
        }


        if (buttons.length >= 6) {
            return interaction.editReply({
                content: "❌ Maximum 6 buttons are allowed."
            });
        }


        const { data: buttonData, error: insertError } = await supabase
            .from("ticket_buttons")
            .insert({
                guild_id: interaction.guild.id,
                label,
                emoji,
                style,
                has_questions: questions.length > 0,
                category_id: category.id,
                order_number: buttons.length + 1
            })
            .select()
            .single();


        if (insertError) {
            console.log(insertError);
            return interaction.editReply({
                content: "❌ Failed to create button."
            });
        }


        if (questions.length > 0) {

            const rows = questions.map((q, index) => ({
                guild_id: interaction.guild.id,
                button_id: buttonData.id,
                question: q.question,
                input_type: q.type,
                question_order: index + 1
            }));


            const { error: questionError } = await supabase
                .from("ticket_questions")
                .insert(rows);


            if (questionError) {
                console.log(questionError);

                return interaction.editReply({
                    content: "❌ Failed to save ticket questions."
                });
            }
        }


        await updatePanel(interaction.guild);


        let message =
            `✅ Button **${label}** has been created successfully.`;


        if (questions.length > 0) {

            message += `\n\n📝 Questions Added: **${questions.length}**\n`;

            questions.forEach((q, i) => {
                message += `**${i + 1}.** ${q.question} (${q.type})\n`;
            });

        } else {

            message += `\n\n📄 This button will create a normal ticket.`;

        }


        return interaction.editReply({
            content: message
        });

    }
};