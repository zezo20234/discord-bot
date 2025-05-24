const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const GUILD_ID = process.env.GUILD_ID;
const BUTTON_CHANNEL_ID = process.env.BUTTON_CHANNEL_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(BUTTON_CHANNEL_ID);

    const button = new ButtonBuilder()
      .setCustomId("apply_now")
      .setLabel("Apply")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
      content: "Click the button below to apply for a role!",
      components: [row],
    });
  } catch (error) {
    console.error("Failed to send the Apply button:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "apply_now") {
    const modal = new ModalBuilder()
      .setCustomId("application_modal")
      .setTitle("Role Application");

    const roleInput = new TextInputBuilder()
      .setCustomId("desired_role")
      .setLabel("What role do you want?")
      .setPlaceholder("Type: pilot, atc, moderator, etc.")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(roleInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "application_modal"
  ) {
    const roleInput = interaction.fields
      .getTextInputValue("desired_role")
      .toLowerCase();
    const member = await interaction.guild.members.fetch(interaction.user.id);

    const allowedRoles = ["pilot", "atc"];
    const redirectRoles = ["moderator", "supervisor", "advertising-manager"];
    const guild = interaction.guild;

    if (allowedRoles.includes(roleInput)) {
      const role = guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleInput,
      );
      if (!role) {
        return interaction.reply({
          content: "❌ Role not found. Please contact an admin.",
          ephemeral: true,
        });
      }

      try {
        await member.roles.add(role);
        await interaction.reply({
          content: `✅ You have been assigned the role **${role.name}**!`,
          ephemeral: true,
        });

        const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID);
        const embed = new EmbedBuilder()
          .setTitle("Role Assigned via Application")
          .setDescription(
            `${interaction.user.username} was assigned role **${role.name}**.`,
          )
          .setColor("Green")
          .setTimestamp();

        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return interaction.reply({
          content:
            "❌ I failed to assign the role. Make sure I have permission to manage roles.",
          ephemeral: true,
        });
      }
    } else if (redirectRoles.includes(roleInput)) {
      await interaction.reply({
        content: "📌 Please go and fill the form in <#applications>.",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content:
          "❌ Invalid role input. Please type a valid role like `pilot` or `atc`.",
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
