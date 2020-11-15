require("dotenv").config();
const Nodeactyl = require('nodeactyl');
const instance = Nodeactyl.Client;

let accessToStatusAPI;
instance.login(process.env.PANEL_CLIENT, process.env.PANEL_CLIENT_KEY, (logged_in, msg) => {
    if(logged_in == true) accessToStatusAPI = true;
    else accessToStatusAPI = false;
});

const mysql = require("mysql2").createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 604800000,
    multipleStatements: true
});

exports.mysql = mysql;

const moment = require("moment");
const express = require("express");
const app = express();
const cors = require('cors');

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
    res.render("index", { userLogin: req.cookies.userLogin || "Личный кабинет" });
});

app.get("/site-api/instanceStatus", (req, res) => {
    if(accessToStatusAPI == false) return res.status(500).json({
        error: {
            code: 500,
            error: "Internal Server Error",
            message: "Внутренняя ошибка сервера. Скорее всего, панель RangeMC недоступна, или API-ключ был удалён."
        }
    });

    return instance.getAllServers().then(async (r) => {
        let data = [];
        for (let server of r) {
            data.push({
                uuid: server.attributes.uuid,
                name: server.attributes.name,
                node: server.attributes.node
            });
        }

        for (let server of data) {
            let status = await instance.getServerStatus(server.uuid);
            server.status = status.current_state;
        }

        return res.status(200).json(data);
    }).catch(e => {
        console.error(e.stack);
        return res.status(500).json({
            error: {
                code: 500,
                error: "Internal Server Error",
                message: "Внутренняя ошибка сервера. Скорее всего, панель RangeMC недоступна, или API-ключ был удалён."
            }
        });
    });
});

app.get("/discord", (req, res) => res.redirect(`https://discord.gg/dZ5bFGh`));
app.get("/bans", (req, res) => {
    mysql.query("SELECT * from punishments WHERE type = 'BAN' OR type = 'TEMPBAN'", (err, bans) => {
        if(err) throw err;
        mysql.query("SELECT * from punishments WHERE type = 'MUTE' OR type = 'TEMPMUTE'", (err, mutes) => {
            if(err) throw err;
        mysql.query("SELECT * FROM punishments", (err, history) => {
            if(err) throw err;
            return res.render("bans", { moment: moment, bans: bans, mutes: mutes, history: history, userLogin: req.cookies.userLogin || "Личный кабинет" });
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

require("./discord");
require("./vk");
app.listen(process.env.PORT, () => console.log(`Да будет *:${process.env.PORT}!`));
