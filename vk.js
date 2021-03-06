const index = require('./index');
require("dotenv").config();

const checkGroup = async (ctx, group, callback) => {
    let author = String(ctx.message.from_id || ctx.message.user_id);
    let user = await index.mysql.promise().query("SELECT * FROM accounts WHERE vk = ?", [author]);
    if(!user[0][0])
        return ctx.reply("🚫 В базе данных нет аккаунта, привязанного на ваш ID страницы.");
    
    let permLevels = {
        "default": 1,
        "helper": 2,
        "moder": 3,
        "stmoder": 4,
        "devel": 5,
        "admin": 6
    };

    let lpData = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
    if(!lpData[0][0])
        return ctx.reply("🚫 О вас нет информации в базе с правами игроков.");

    let userLevel = permLevels[lpData[0][0].primary_group];
    let requiredLevel = permLevels[group];
    if(userLevel < requiredLevel)
        return ctx.reply(`🚫 У Вас должна быть группа "${group}" для выполнения данной команды.\nВаша группа: ${(lpData[0][0].primary_group) ? lpData[0][0].primary_group : "неизвестно"}`);

    return callback({ user, lpData });
};

const VkBot = require("node-vk-bot-api");
const bot = new VkBot({
    token: index.config.vkbot.token,
    group_id: index.config.vkbot.group_id,
    execute_timeout: 50,
    polling_timeout: 25
});

bot.on((ctx) => {
    const messageContent = String(ctx.message.body || ctx.message.text);
    // const messageAuthorID = String(ctx.message.from_id || ctx.message.user_id);

    if(!messageContent.startsWith(index.config.discord.prefix)) return;

	const args = messageContent.slice(index.config.discord.prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();
	
	if(command == "help") {
        return checkGroup(ctx, "helper", async ({ user, lpData }) => {
            let arr = [
                `Доступные команды:`,
                `- info        <логин>  |  Доступно от хелпера`,
                `- skin        <логин>  |  Доступно от хелпера`,
                `- cloak       <логин>  |  Доступно от хелпера`,
                `- unreg       <логин>  |  Доступно от администратора`,
                `- activate    <логин>  |  Доступно от администратора`,
                `- deactivate  <логин>  |  Доступно от администратора`,
                ``,
                `<> - обязательные аргументы`,
                `[] - необязательные аргументы`,
                ``,
                `Ваш никнейм: ${user[0][0].login}`,
                `Ваша группа: ${lpData[0][0].primary_group}`
            ];

            return ctx.reply(arr.join("\n"));
        });
    }

    if(command == "unreg") {
        return checkGroup(ctx, "admin", async () => {
            let login = args[0];
            if(!login) return ctx.reply("🚫 Правильное использование команды: unreg <логин>");
            else return index.mysql.query("SELECT * FROM accounts WHERE login = ?", [login], (err, res) => {
                if(err) {
                    console.error(err);
                    return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                } else {
                    if(!res[0]) return ctx.reply("🚫 Пользователя нет в базе.");
                    else return index.mysql.query("DELETE FROM accounts WHERE login = ?", [login], (err) => {
                        if(err) {
                            console.error(err);
                            return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                        } else return ctx.reply("✅ Пользователь удалён.");
                    });
                }
            });
        });
    }

    if(command == "activate") {
        return checkGroup(ctx, "admin", async () => {
            let login = args[0];
            if(!login) return ctx.reply("🚫 Правильное использование команды: activate <логин>");
            else return index.mysql.query("SELECT * FROM accounts WHERE login = ?", [login], (err, res) => {
                if(err) {
                    console.error(err);
                    return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                } else {
                    if(!res[0]) return ctx.reply("🚫 Пользователя нет в базе.");
                    if(Number(res[0].blocked) == 0) return ctx.reply("🚫 Пользователь уже активирован.");
                    else return index.mysql.query("UPDATE accounts SET blocked = ? WHERE login = ?", ["0", login], (err) => {
                        if(err) {
                            console.error(err);
                            return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                        } else return ctx.reply("✅ Пользователь активирован.");
                    });
                }
            });
        });
    }

    if(command == "deactivate") {
        return checkGroup(ctx, "admin", async () => {
            let login = args[0];
            if(!login) return ctx.reply("🚫 Правильное использование команды: deactivate <логин>");
            else return index.mysql.query("SELECT * FROM accounts WHERE login = ?", [login], (err, res) => {
                if(err) {
                    console.error(err);
                    return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                } else {
                    if(!res[0]) return ctx.reply("🚫 Пользователя нет в базе.");
                    if(Number(res[0].blocked) == 1) return ctx.reply("🚫 Пользователь уже деактивирован.");
                    else return index.mysql.query("UPDATE accounts SET blocked = ? WHERE login = ?", ["1", login], (err) => {
                        if(err) {
                            console.error(err);
                            return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                        } else return ctx.reply("✅ Пользователь деактивирован.");
                    });
                }
            });
        });
    }

    if(command == "info") {
        return checkGroup(ctx, "helper", async () => {
            let login = args[0];
            if(!login) return ctx.reply("🚫 Правильное использование команды: info <логин>");
            else return index.mysql.query("SELECT * FROM accounts WHERE login = ?", [login], (err, res) => {
                if(err) {
                    console.error(err);
                    return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                } else {
                    if(!res[0]) return ctx.reply("🚫 Пользователя нет в базе.");

                    let arr = [
                        `Информация о игроке: ${res[0].login}`,
                        `VK: vk.com/id${res[0].vk}`,
                        ``,
                        `Прочие параметры:`,
                        `- discord | ${res[0].discord}`,
                        `- blocked | ${res[0].blocked}`,
                        `- invited_by | ${res[0].invited_by}`,
                    ];

                    return ctx.reply(arr.join("\n"));
                }
            });
        });
    }

    if(command == "skin") {
        return checkGroup(ctx, "helper", async () => {
            let login = args[0];
            if(!login) return ctx.reply("🚫 Правильное использование команды: skin <логин>");
            else return index.mysql.query("SELECT * FROM skins WHERE login = ?", [login], (err, res) => {
                if(err) {
                    console.error(err);
                    return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                } else {
                    if(!res[0]) return ctx.reply("🚫 Пользователя нет в базе.");
                    else {
                        let arr = [
                            `Скин игрока ${login}:`,
                            `- Хэш                    | ${res[0].hash}`,
                            `- Прямая ссылка на файл  | https://rangemc.ovh/api/skins-folder/${res[0].hash}`
                        ];

                        return ctx.reply(arr.join("\n"));
                    }
                }
            });
        });
    }

    if(command == "cloak") {
        return checkGroup(ctx, "helper", async () => {
            let login = args[0];
            if(!login) return ctx.reply("🚫 Правильное использование команды: cloak <логин>");
            else return index.mysql.query("SELECT * FROM cloaks WHERE login = ?", [login], (err, res) => {
                if(err) {
                    console.error(err);
                    return ctx.reply("🚫 Произошла ошибка. Проверьте консоль.");
                } else {
                    if(!res[0]) return ctx.reply("🚫 Пользователя нет в базе.");
                    else {
                        let arr = [
                            `Плащ игрока ${login}:`,
                            `- Хэш                    | ${res[0].hash}`,
                            `- Прямая ссылка на файл  | https://rangemc.ovh/api/cloaks-folder/${res[0].hash}`
                        ];

                        return ctx.reply(arr.join("\n"));
                    }
                }
            });
        });
    }
});

bot.startPolling().then(() => console.log("Бот ВК запущен."));