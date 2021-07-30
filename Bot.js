const fs = require("fs");
const Discord = require('discord.js');
const disbut = require('discord-buttons');

const config = require("./config.json");

const msg_help = "";

module.exports = class Bot {
	static #client = new Discord.Client();
	static get client() { return Bot.#client; }

	#nsfwCategories = {};

	constructor() {
	}

	static async create() {
		let bot = new Bot();

		Bot.client.on('ready', async () => {
			console.info(`Successfully logged in as ${Bot.client.user.tag}`);

			let guilds = Bot.client.guilds.cache.map(g => g);
			for (const guild of guilds) {
				let members = await guild.members.fetch({ force: true });
			}

			let ottGuild = Bot.client.guilds.cache.find(g => g.id == "761013040204218418");
			bot.#nsfwCategories[ottGuild.id] = ottGuild.channels.cache.find(c => c.id == "781690974446813205");
		});


		process.on('SIGINT', bot.shutdown.bind(bot));

		Bot.client.on('message', bot.handleMessage.bind(bot));
		Bot.client.on('messageUpdate', bot.handleEdit.bind(bot));
		Bot.client.on('messageDelete', bot.handleDelete.bind(bot));
		Bot.client.on('clickButton', bot.handleButton.bind(bot));

		console.info("Logging in...");
		Bot.client.login(config.token);

		require('discord-buttons')(Bot.client);

		return bot;
	}

	async shutdown() {
		Bot.client.destroy();
		process.exit();
	}

	async handleMessage(msg) {
		if (msg.author.bot) { return; }

		if (msg.content.startsWith(config.prefix)) { this.handleCommand(msg); return; }
	}

	async handleCommand(msg) {
		if (msg.author.bot) { return; }

		console.info(msg.author.tag + " in " + msg.channel.name + ": " + msg.content);

		const args = msg.content.slice(config.prefix.length).trim().split(' ');
		const comm = args.shift().toLowerCase();

		if (this.#commands[comm]) {
			this.#commands[comm].bind(this)(msg, args);
		}
	}

	async handleEdit(oldMsg, newMsg) {
		if (oldMsg.author.bot) { return; }
	}

	async handleDelete(msg) {
		if (msg.author.bot) { return; }
	}

	async handleButton(btn) {
		btn.reply.defer();

		let guild = btn.channel.guild;
		if (btn.id.match(/.*-join-nsfw$/)) {
			console.log("Join");
			this.#nsfwCategories[guild.id].updateOverwrite(btn.clicker.user, {
				'VIEW_CHANNEL': true,
				'CONNECT' : true,
			}).then(c => console.log(c.permissionOverwrites.get(btn.clicker.user.id)))
				.catch(console.error);
		}
		if (btn.id.match(/.*-leave-nsfw$/)) {
			console.log("Leave");
			this.#nsfwCategories[guild.id].updateOverwrite(btn.clicker.user, {
				'VIEW_CHANNEL': false,
				'CONNECT' : false,
			}).then(c => console.log(c.permissionOverwrites.get(btn.clicker.user.id)))
				.catch(console.error);
		}
	}

	#commands = {
		help: async function(msg) {
			msg.channel.send(msg_help);
		},

		status: async function(msg) {
			let sent = await msg.channel.send("Checking status...");

			let embed = new Discord.MessageEmbed()
				.setTitle("Status")
				.setColor(0x000000)
				.setTimestamp(Date.now())
				.setAuthor(Bot.client.user.username, "", "")
				.addFields([
					{ name: "Heartbeat", value: `${Bot.client.ws.ping}ms` },
					{ name: "Latency", value: `${sent.createdTimestamp - msg.createdTimestamp}ms` },
				])
				.setFooter("Created by Thalins#0502", Bot.client.user.displayAvatarURL());

			sent.edit("", embed);
		},

		stop: async function(msg) {
			if (msg.author.id != config.owner) { return; }

			Bot.client.destroy();
			process.exit();
		},

		createmenu: function(msg) {
			if (msg.author.id != config.owner) { return; }

			let buttons = new disbut.MessageActionRow().addComponents([
				new disbut.MessageButton()
				.setStyle('green')
				.setLabel("Join NSFW")
				.setID(`${msg.channel.guild.id}-join-nsfw`),

				new disbut.MessageButton()
				.setStyle('red')
				.setLabel("Leave NSFW")
				.setID(`${msg.channel.guild.id}-leave-nsfw`),
			]);

			msg.channel.send("Press these buttons to opt in or out of the NSFW category.\n" +
				             "This is completely silent, and does not apply a role.",
				             buttons);
		}
	};
}
