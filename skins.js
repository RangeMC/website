const index = require('./index');
const express = require('express');
const router = express.Router();
const fs = require("fs");

router.get("/", (req, res) => { // надо сделать отображение головы
    res.sendFile(__dirname + "/skins/default.png");
});

router.get("/:nickname.png", (req, res) => {
    let pathToDefaultPlayerSkin = __dirname + `/skins/default.png`;
    index.mysql.query("SELECT * FROM skins WHERE login = ?", [req.params.nickname], (err, skin) => {
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