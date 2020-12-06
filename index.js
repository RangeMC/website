const fs = require('fs');

if (!fs.existsSync('./config.yml')) {
    fs.writeFileSync('./config.yml', `
app:
    port: 3000 # порт вебсервера
    shop_id: '' # ID магазина TradeMC

mysql:
    host: localhost
    port: 3306
    user: ''
    password: ''
    database: ''

alert:
    enabled: false
    type: primary # достуные варианты - primary (голубой), success (зелёный), danger (красный)
    text: '' # текст новости
    link: '' # ссылка на новость

discord:
    enabled: false
    prefix: '!' # префикс бота
    token: '' # токен бота

vkbot:
    enabled: false
    token: '' # токен бота
    group_id: '' # ID группы ВК
`, function (err) {
  if (err) return console.log(err);
  console.log('Файл конфигурации успешно создан!');
  console.log('Пожалуйста, заполните все данные в config.yml.');
  process.exit();
});
}

const config = require('config-yml');
const moment = require("moment");
const express = require("express");
const app = express();
const cors = require('cors');

const mysql = require("mysql2").createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    connectTimeout: 604800000,
    multipleStatements: true
});

exports.config = config;
exports.mysql = mysql;

app.use(cors());
app.options('*', cors());
app.enable('trust proxy');
app.disable('x-powered-by');
app.set("view engine", "ejs");
app.use(require("cookie-parser")());
app.use("/static", express.static("static"));
app.use("/api", require("./api"));
app.use("/panel", require("./panel"));
app.use("/skin", require("./skins"));
app.use("/cloak", require("./cloaks"));

app.get("/", (req, res) => {
    res.render("index", { config: config, userLogin: req.cookies.userLogin || "Личный кабинет" });
});

app.get("/discord", (req, res) => res.redirect(`https://discord.rangemc.ovh`));
app.get("/bans", (req, res) => {
    mysql.query("SELECT * from punishments WHERE type = 'BAN' OR type = 'TEMPBAN'", (err, bans) => {
        if(err) throw err;
        mysql.query("SELECT * from punishments WHERE type = 'MUTE' OR type = 'TEMPMUTE'", (err, mutes) => {
            if(err) throw err;
        mysql.query("SELECT * FROM punishments", (err, history) => {
            if(err) throw err;
            return res.render("bans", { config: config, moment: moment, bans: bans, mutes: mutes, history: history, userLogin: req.cookies.userLogin || "Личный кабинет" });
        });
      });
   });
});

app.use((req, res, next) => {
    res.status(404).render("error", { error: 404, errorProcessed: `Страница, которую вы ищите была <br>перемещена, удалена или её никогда <br> не существовало.`, userLogin: req.cookies.userLogin || "Личный кабинет" });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render("error", { error: 500, errorProcessed: "Произошла внутренняя ошибка сервера, <br> обратитесь в нашу группу ВКонтакте.", userLogin: req.cookies.userLogin || "Личный кабинет" });
});

if (config.discord.enabled == true) {
    require("./discord");
}
if (config.vkbot.enabled == true) {
    require("./vk");
}
app.listen(config.app.port, () => console.log(`Да будет *:${config.app.port}!`));
