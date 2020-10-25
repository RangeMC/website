const express = require('express');
const router = express.Router();
const fs = require("fs");
const account = require("mysql2").createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE_ACCOUNTS,
    connectTimeout: 604800000
});

router.get("/", (req, res) => { // надо сделать отображение головы
    res.sendFile(__dirname + "/skins/default.png");
});

router.get("/:nickname", (req, res) => {
    let pathToDefaultPlayerSkin = __dirname + `/skins/default.png`;
    account.query("SELECT * FROM skins WHERE login = ?", [req.params.nickname], (err, skin) => {
        if(err) return console.error(err);
        if(!skin[0]) return res.sendFile(pathToDefaultPlayerSkin);
        else {
            if(fs.existsSync(`./skins/${skin[0].hash}`)) return res.sendFile(__dirname + `/skins/${skin[0].hash}`);
            else return res.sendFile(pathToDefaultPlayerSkin);
        }
    });
});

router.use((req, res, next) => {
    res.status(404).sendFile(__dirname + "/skins/default.png");
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: { code: 500, name: "Internal Server Error", message: "Внутренняя ошибка сервера. Обратитесь в группу ВКонтакте: https://vk.me/rangemc" } });
});

module.exports = router;