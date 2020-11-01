require("dotenv").config();
const { Client, RichEmbed } = require("discord.js");
const client = new Client();

client.on("ready", () => {
    client.user.setPresence({ game: { type: 3, name: (process.env.PREFIX + "verify") } });
    return console.info(`Бот Discord запущен.`);
});

const voiceConfig = {
	categoryID: "705836877709574225",
    voiceID: "705836924497297528",
    permissions: [{
        "VIEW_CHANNEL": true, "CONNECT": true, "SPEAK": true, "USE_VAD": true, "PRIORITY_SPEAKER": true,
        "MANAGE_CHANNELS": true, "MANAGE_ROLES_OR_PERMISSIONS": true, "MOVE_MEMBERS": true
    }, {
        "VIEW_CHANNEL": true, "CONNECT": false, "SPEAK": true, "USE_VAD": true, "PRIORITY_SPEAKER": false,
        "MANAGE_CHANNELS": false, "MANAGE_ROLES_OR_PERMISSIONS": false, "MOVE_MEMBERS": false
    }]
};

client.on('voiceStateUpdate', (Old, New) => {
    if(New.user.bot) return;
    if(Old.user.bot) return;

    if(New.voiceChannelID == voiceConfig.voiceID) {
        New.guild.createChannel(New.user.username, { type: "voice", parent: voiceConfig.categoryID })
            .then((set) => {
                set.overwritePermissions(New.user, voiceConfig.permissions[0]);
                set.overwritePermissions(New.guild.id, voiceConfig.permissions[1]);
            
                return New.setVoiceChannel(New.guild.channels.get(set.id)).catch((err) => set.delete());
            });
    }

    if(Old.voiceChannel) {
        let filter = (ch) =>
            (ch.parentID == voiceConfig.categoryID)
            && (ch.id !== voiceConfig.voiceID)
            && (Old.voiceChannelID == ch.id)
            && (Old.voiceChannel.members.size == 0);
        
        return Old.guild.channels
            .filter(filter)
            .forEach((ch) => ch.delete());
    }
});

client.on("guildMemberAdd", (member) => {
    return mysql.promise().query("SELECT * FROM accounts WHERE discord = ?", [member.user.id])
        .then((user) => {
            if(!user[0][0]) return;
            else return member.addRole("705832684014010530");
        }).catch(console.error);
});

client.on("message", (message) => {
    if(!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

	const args = message.content.slice(process.env.PREFIX.length).split(/ +/);
    const command = args.shift().toLowerCase();
	
	if(command == "userinfo") {
		let member = message.guild.member(
			message.mentions.users.first()
			|| message.guild.members.get(args[0])
		);
		if(!member) return message.channel.send(`:x: | Вы не указали пользователя.`);
		
		return mysql.promise().query("SELECT * FROM accounts WHERE discord = ?", [member.user.id])
			.then((user) => {
				if(!user[0][0]) return message.channel.send(`:x: | Аккаунта с таким пользователем нет в базе данных.`);
				else return message.channel.send(`:white_check_mark: | **${member.user.tag}** - **${user[0][0].login}**`);
			}).catch(console.error);
	}
    
    if(command == "verify") {
        if(message.channel.type == "dm") {
            if(client.guilds.get("705826192493772860").members.get(message.author.id).roles.has("705832684014010530"))
                return message.channel.send(`:warning: | Вы уже верифицированы на сервере!`);

            let sessionKey = args.join(" ");
            if(!sessionKey) return message.channel.send(`:x: | Вы не указали ключ сессии.\nЕго можно получить на этой странице: <https://rangemc.ovh/panel/data>`);

            return mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [sessionKey])
                .then((user) => {
                    if(!user[0][0]) return message.channel.send(`:x: | Аккаунта с таким ключом нет в базе данных.`);
                    if(user[0][0].discord !== null) {
                        let linked = client.users.get(user[0][0].discord);
                        if(!linked) return message.channel.send(`:x: | К данному аккаунту уже привязан Discord.\nПривязанный Discord: \`DELETED\``);
                        else return message.channel.send(`:x: | К данному аккаунту уже привязан Discord.\nПривязанный Discord: \`${linked.username}#${linked.discriminator}\` (\`${linked.id}\`)`);
                    } else return mysql.promise().query("UPDATE accounts SET discord = ? WHERE id = ?", [message.author.id, user[0][0].id])
                        .then(() => {
							client.guilds.get("705826192493772860")
								.members.get(message.author.id)
								.addRole("705832684014010530");

                            return message.channel.send(`:white_check_mark: | Вы успешно привязали свой Discord к аккаунту RangeMC. Поздравляем! :tada:\n[!] Вам был открыт доступ к каналам на нашем сервере.`);
                        }).catch(console.error);
                }).catch(console.error);
        } else {
            const embed = new RichEmbed()
                .setColor("#7289DA")
                .setAuthor("Верификация на сервере RangeMC", client.user.displayAvatarURL)
                .setDescription(`Для того чтобы верифицироваться на сервере **RangeMC**, вы должны отдать мне свой ключ сессии.`)
                .addField("Как отдать этот ключ?", `Пропиши в данном диалоге \`${process.env.PREFIX + command} <ключ>\`.`)
                .addField("Где получить ключ?", `Вы должны быть авторизованным в нашем ЛК.\nСам ключ указан на этой странице: **<https://rangemc.ovh/panel/data>**`);

            return message.delete().then(() => message.author.send(embed).catch((err) => message.channel.send(`:warning: | ${message.author}, откройте свои личные сообщения!`)));
        }
    }
});

client.login(process.env.TOKEN);
