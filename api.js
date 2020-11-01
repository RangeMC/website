const express = require('express');
const con = require("mysql2").createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE_ACCOUNTS,
    connectTimeout: 604800000
});

const validUsername = new RegExp(/[a-zA-Z0-9_]{1,16}$/);
const luckperms = require("mysql2").createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE_LUCKPERMS,
    charset: "utf8mb4",
    insecureAuth: true
});

const router = express.Router();
router.use(require("cors")());
router.use("/skins-folder", express.static("skins"));
router.use("/cloaks-folder", express.static("cloaks"));

router.get("/", (req, res) => {
    return res.redirect("/api/endpoints");
});

router.get("/endpoints", (req, res) => {
    return res.status(200).json({
        "/api/user/:username": {
            id: 0,
            username: "",
            invited_by: {},
            rank: "",
            blocked: {
                number: 0,
                string: "",
                boolean: false
            },
            skin: "",
            cloak: ""
        }
    });
});

router.get("/user/:username", (req, res) => {
    if(validUsername.test(req.params.username) == false)
        return res.status(400).json({ error: { code: 400, message: "Указан некорректный никнейм." } });

    return con.promise().query("SELECT id, login, balance, uuid FROM accounts WHERE login = ?", [req.params.username])
        .then((user) => {
            if(!user[0][0])
                return res.status(404).json({ error: { code: 404, message: "Игрок не найден." } });
            else {
                let userGroup = luckperms.promise().query("SELECT username, primary_group FROM luckperms_players WHERE username = ?", [req.params.username.toLowerCase()])
                .then((rank) => {
                if(user[0][0].invited_by == null)
                    return res.status(200).json({
                        id: user[0][0].id,
                        username: user[0][0].login,
                        rank: rank[0][0].primary_group,
                        coins: Number(user[0][0].balance),
                        uuid: user[0][0].uuid,
                        skin: `https://rangemc.ovh/skin/${user[0][0].login}.png`,
                        cloak: `https://rangemc.ovh/cloak/${user[0][0].login}.png`
                    });
            })
        }
        }).catch(console.error);
});

router.use((req, res, next) => {
    return res.status(404).json({ error: { code: 404, message: "Метод не найден" } });
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).json({ error: { code: 500, message: "Внутренняя ошибка сервера" } });
});

module.exports = router;