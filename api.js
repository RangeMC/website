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
const processedRank = (id) => {
    return ({
        0: "USER",
        1: "HELPER",
        2: "MODER",
        3: "ADMIN",
        4: "DEV"
    })[id];
};

const router = express.Router();
router.use(require("cors")());
router.use("/skins-folder", express.static("skins"));
router.use("/cloaks-folder", express.static("cloaks"));

// router.get("/", (req, res) => {
//     return res.redirect("/api/endpoints");
// });

// router.get("/endpoints", (req, res) => {
//     return res.status(200).json({
//         "/api/user/:username": {
//             id: 0,
//             username: "",
//             invited_by: {},
//             rank: "",
//             blocked: {
//                 number: 0,
//                 string: "",
//                 boolean: false
//             },
//             skin: "",
//             cloak: ""
//         }
//     });
// });

// router.get("/user/:username", (req, res) => {
//     if(validUsername.test(req.params.username) == false)
//         return res.status(400).json({ error: { code: 400, message: "Указан некорректный никнейм." } });

//     return con.promise().query("SELECT id, login, access, blocked, invited_by FROM accounts WHERE login = ?", [req.params.username])
//         .then((user) => {
//             if(!user[0][0])
//                 return res.status(404).json({ error: { code: 404, message: "Игрок не найден." } });
//             else {
//                 if(user[0][0].invited_by == null)
//                     return res.status(200).json({
//                         id: user[0][0].id,
//                         username: user[0][0].login,
//                         invited_by: null,
//                         rank: processedRank(user[0][0].access),
//                         blocked: {
//                             number: Number(user[0][0].blocked),
//                             string: String(user[0][0].blocked),
//                             boolean: Boolean(user[0][0].blocked)
//                         },
//                         skin: `https://rangemc.ovh/skin/${user[0][0].login}`,
//                         cloak: `https://rangemc.ovh/cloak/${user[0][0].login}`
//                     });
//                 else {
//                     con.promise().query("SELECT id, login, access, blocked, invited_by FROM accounts WHERE login = ?", [user[0][0].invited_by])
//                         .then((invited) => res.status(200).json({
//                             id: user[0][0].id,
//                             username: user[0][0].login,
//                             invited_by: {
//                                 id: invited[0][0].id,
//                                 username: invited[0][0].login,
//                                 rank: processedRank(invited[0][0].access),
//                                 blocked: {
//                                     number: Number(invited[0][0].blocked),
//                                     string: String(invited[0][0].blocked),
//                                     boolean: Boolean(invited[0][0].blocked)
//                                 },
//                                 skin: `https://rangemc.ovh/skin/${invited[0][0].login}`,
//                                 cloak: `https://rangemc.ovh/cloak/${invited[0][0].login}`
//                             },
//                             rank: processedRank(user[0][0].access),
//                             blocked: {
//                                 number: Number(user[0][0].blocked),
//                                 string: String(user[0][0].blocked),
//                                 boolean: Boolean(user[0][0].blocked)
//                             },
//                             skin: `https://rangemc.ovh/skin/${user[0][0].login}`,
//                             cloak: `https://rangemc.ovh/cloak/${user[0][0].login}`
//                         }));
//                 }
//             }
//         }).catch(console.error);
// });

router.use((req, res, next) => {
    return res.status(404).json({ error: { code: 404, message: "Метод не найден" } });
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    return res.status(500).json({ error: { code: 500, message: "Внутренняя ошибка сервера" } });
});

module.exports = router;