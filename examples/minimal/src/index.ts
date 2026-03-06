import { Client, fmt, embed, row, button, SlashCommandBuilder } from "@volundr/client";
import { GatewayIntents, ButtonStyle } from "@volundr/types";

const client = new Client({
    token: process.env.DISCORD_TOKEN!,
    intents: GatewayIntents.Guilds | GatewayIntents.GuildMessages | GatewayIntents.MessageContent,
});

// Register commands on ready
client.once("ready", async () => {
    console.log(`Online as ${client.user!.tag}`);

    await client.setGlobalCommands([
        new SlashCommandBuilder()
            .setName("ping")
            .setDescription("Check bot latency")
            .toJSON(),
        new SlashCommandBuilder()
            .setName("userinfo")
            .setDescription("Show info about a user")
            .addUserOption(opt => opt.setName("user").setDescription("Target user"))
            .toJSON(),
    ]);
});

// Slash commands
client.command("ping", async (i) => {
    const start = Date.now();
    await i.reply("Pinging...");
    await i.editReply(`Pong! ${Date.now() - start}ms`);
});

client.command("userinfo", async (i) => {
    const user = i.options.getUser("user", i.client) ?? i.user;

    await i.reply({
        embeds: [embed({
            title: user.displayName,
            thumbnail: user.displayAvatarURL(),
            fields: [
                { name: "ID", value: user.id, inline: true },
                { name: "Created", value: user.createdAt.toDateString(), inline: true },
            ],
            color: 0x5865F2,
        })],
        components: [row(button("refresh", "Refresh", ButtonStyle.Primary))],
    });
});

// Button handler
client.button("refresh", async (i) => {
    await i.update(fmt`Refreshed by ${i.user}!`);
});

// Prefix command
client.on("MESSAGE_CREATE", async (message) => {
    if (message.author.bot) return;
    if (message.content === "!hello") {
        await message.reply(fmt`Hey ${message.author}!`);
    }
});

client.connect();
