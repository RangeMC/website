const index = require('./index');
const path = require("path");
const uuid = require("uuid");
const md5 = require("md5");
const os = require('os');

const Google = require("express-recaptcha").RecaptchaV3;
const recaptcha = new Google('6Ld7KNgZAAAAACD5dy4xH0PthgsLSL1ZH0eXf03K', '6Ld7KNgZAAAAAE1gPNIeuPt-7LsAb32ZDq5RRqA6', { hl: 'ru', callback: 'insertToForm' });

const multer = require("multer");
const storages = {
    skins: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "skins/");
        },
        filename: function (req, file, cb) {
            cb(null, uuid.v4() + path.extname(file.originalname));
        }
    }),
    cloaks: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, "cloaks/");
        },
        filename: function (req, file, cb) {
            cb(null, uuid.v4() + path.extname(file.originalname));
        }
    })
};

const multerConfig = (str) => ({
    storage: str,
    limits: {
        fields: 1,
        fileSize: 1000000,
        files: 1,
        parts: 1
    },
    fileFilter: (req, file, cb) => {
        if(!file.originalname.match(/\.(jpg|png)$/)) {
            return cb(new Error("Разрешена загрузка только PNG и JPG формата."));
        }
        cb(null, true);
    }
});

const uploadSkin = multer(multerConfig(storages.skins)).single("skin");
const uploadCloak = multer(multerConfig(storages.cloaks)).single("cloak");

const moment = require("moment");
const express = require('express');

const userGroups = {
    default: "Игрок",
    helper: "Хелпер",
    moder: "Модер",
    stmoder: "Ст.Модер",
    devel: "Разраб",
    admin: "Админ"
};

const errors = {
    NotFound: "Аккаунт не найден.",
    Found: "Такой аккаунт уже существует.",
    RecaptchaError: "Не пройдена проверка на бота.",
    IncorrectPassword: "Указан неверный пароль к аккаунту.",
    Deactivated: "Ваш аккаунт заблокирован администрацией.",
    Logout: "Вы вышли из аккаунта. Всего доброго! c:"
};

const args = {
    SuccessAddUser: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ СОЗДАЛИ НОВЫЙ <br> АККАУНТ ИГРОКА</h3>",
    SuccessEditUser: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ ИЗМЕНИЛИ ДАННЫЕ <br> АККАУНТА ИГРОКА</h3>",
    SuccessDeleteUser: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ НАВСЕГДА УДАЛИЛИ <br> АККАУНТ ИГРОКА</h3>",
    SuccessRegistration: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ ЗАРЕГИСТРИРОВАЛИСЬ <br> НА RANGEMC</h3>",
    SuccessPasswordChange: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ СМЕНИЛИ ПАРОЛЬ К <br> ВАШЕМУ АККАУНТУ</h3>",
    SuccessSkinChange: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ СМЕНИЛИ СКИН <br> ВАШЕГО АККАУНТА</h3>",
    SuccessCloakChange: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>ВЫ СМЕНИЛИ ПЛАЩ <br> ВАШЕГО АККАУНТА</h3>",
    AccessDenied: "<h1 style='color: #F1FFA3;'>СОЖАЛЕЮ!</h1><h3 style='color: #FFEEFF;'>У ВАС НЕТ ДОСТУПА К <br> ДАННОЙ СТРАНИЦЕ</h3>",
    DonateError: "<h1 style='color: #F1FFA3;'>СОЖАЛЕЮ!</h1><h3 style='color: #FFEEFF;'>ПРОИЗОШЛА ОШИБКА <br> ПРИ ПОКУПКЕ ДОНАТА</h3>",
    DonatePending: "<h1 style='color: #F1FFA3;'>ОЖИДАЙТЕ!</h1><h3 style='color: #FFEEFF;'>ВАШ ПЛАТЁЖ <br> ПРИНЯТ В ОБРАБОТКУ</h3>",
    DonateSuccess: "<h1 style='color: #33FF00;'>УСПЕШНО!</h1><h3 style='color: #FFEEFF;'>СПАСИБО ЗА <br> ПОКУПКУ ДОНАТА</h3>"
};

function errorProcess(error) {
    return errors[error];
}

function eventProcess(arg) {
    return args[arg];
}

const RCON = require("./rcon");
const rcon = new RCON({
    host: process.env.MYSQL_HOST,
    port: process.env.RCON_PORT,
    password: process.env.RCON_PASSWORD
});

const router = express.Router();
router.use(require("cookie-parser")());
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get("/", (req, res) => {
    if(!req.cookies.loginHash) return res.redirect("/panel/login");
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) {
                res.cookie("loginHash", null, { maxAge: -1 });
                res.cookie("userLogin", null, { maxAge: -1 });
                return res.redirect("/panel/login");
            } else {
                let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
                if(!userGroup[0][0]) return index.mysql.promise().query("INSERT INTO luckperms_players (uuid, username, primary_group) VALUES (?, ?, ?)", [user[0][0].uuid, user[0][0].login, "default"])
                    .then(() => res.redirect("/panel/event?type=SuccessRegistration"))
                    .catch(console.error);
                    index.mysql.query("SELECT * FROM punishments WHERE username = ? AND type = 'BAN' OR type = 'TEMPBAN' LIMIT 1", [user[0][0].login], (err, bans) => {
                        if(err) throw err;
                        let arch = os.arch();
                        let platform = os.platform();
                        let type = os.type();
                        let hostname = os.hostname();
                        let cpus = os.cpus();
                        let release = os.release();
                        let shop_id = process.env.SHOP_ID;
                        return index.mysql.promise().query("SELECT * FROM accounts")
                        .then((accounts) => res.render("panel/index", { shop_id: shop_id, release: release, cpus: cpus, arch: arch, platform: platform, type: type, hostname: hostname, account: user[0][0], accounts: accounts[0], moment: moment, bans: bans, userGroup: userGroup, userGroups: userGroups, userLogin: req.cookies.userLogin || "Личный кабинет" }));
                    });
            }
        }).catch(console.error);
});

router.get("/data", (req, res) => {
    if(!req.cookies.loginHash) return res.redirect("/panel/login");
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) {
                res.cookie("loginHash", null, { maxAge: -1 });
                res.cookie("userLogin", null, { maxAge: -1 });
                return res.redirect("/panel/login");
            } else {
                let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
                if(!userGroup[0][0]) return index.mysql.promise().query("INSERT INTO luckperms_players (uuid, username, primary_group) VALUES (?, ?, ?)", [user[0][0].uuid, user[0][0].login, "default"])
                    .then(() => res.redirect("/panel/event?type=SuccessRegistration"))
                    .catch(console.error);
                    index.mysql.query("SELECT * FROM punishments WHERE username = ? AND type = 'BAN' OR type = 'TEMPBAN' LIMIT 1", [user[0][0].login], (err, bans) => {
                        if(err) throw err;
                        return index.mysql.promise().query("SELECT * FROM accounts")
                        .then((accounts) => res.render("panel/data", { account: user[0][0], userGroup: userGroup, userGroups: userGroups, userLogin: req.cookies.userLogin || "Личный кабинет" }));
                });
        }
    }).catch(console.error);
});

router.get("/admin", (req, res) => {
    if(!req.cookies.loginHash) return res.redirect("/panel/login");
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) {
                res.cookie("loginHash", null, { maxAge: -1 });
                res.cookie("userLogin", null, { maxAge: -1 });
                return res.redirect("/panel/login");
            } else {
                let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
                if(!["admin"].includes(userGroup[0][0].primary_group)) return res.redirect("/panel/event?type=AccessDenied");
                else return res.redirect("/panel");
            }
        }).catch(console.error);
});

router.get("/apply/:nickname", (req, res) => {
    if(!req.cookies.loginHash) return res.redirect("/panel/login");
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then((user) => {
            if(!user[0][0]) {
                res.cookie("loginHash", null, { maxAge: -1 });
                res.cookie("userLogin", null, { maxAge: -1 });
                return res.redirect("/panel/login");
            } else {
                if(!['skin', 'cloak'].includes(req.query.type)) return res.redirect("/panel");
                if(req.query.accept == "true")
                    return index.mysql.promise().query(`SELECT * FROM ${(req.query.type == "skin") ? "skins" : (req.query.type == "cloak") ? "cloaks" : "undefined"} WHERE login = ?`, [req.params.nickname])
                        .then((item) => {
                            if(!item[0][0]) return res.redirect("/panel");
                            else return index.mysql.promise().query(`UPDATE ${(req.query.type == "skin") ? "skins" : (req.query.type == "cloak") ? "cloaks" : "undefined"} SET hash = ? WHERE login = ?`, [item[0][0].hash, user[0][0].login])
                                .then(() => {
                                    // rcon.send(`kick ${user[0][0].login} @${(req.query.type == "skin") ? "Skin" : (req.query.type == "cloak") ? "Cloak" : "undefined"}Changed`);
                                    res.redirect(`/panel/event?type=Success${(req.query.type == "skin") ? "Skin" : (req.query.type == "cloak") ? "Cloak" : "undefined"}Change`);
                                }).catch(() => index.mysql.promise().query(`INSERT INTO ${(req.query.type == "skin") ? "skins" : (req.query.type == "cloak") ? "cloaks" : "undefined"} (hash, login) VALUES (?, ?)`, [item[0][0].hash, user[0][0].login])
                                    .then(() => {
                                        // rcon.send(`kick ${user[0][0].login} @${(req.query.type == "skin") ? "Skin" : (req.query.type == "cloak") ? "Cloak" : "undefined"}Changed`);
                                        res.redirect(`/panel/event?type=Success${(req.query.type == "skin") ? "Skin" : (req.query.type == "cloak") ? "Cloak" : "undefined"}Change`);
                                    }).catch(console.error)
                                );
                        }).catch(console.error);
                else return index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.params.nickname])
                    .then((accounts) => {
                        if(!accounts[0][0]) return res.redirect("/panel");
                        else return res.redirect("/panel");
                    }).catch(console.error);
            }
        }).catch(console.error);
});

router.get("/admin/:login", (req, res) => {
    if(!req.cookies.loginHash) return res.redirect("/panel/login");
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) {
                res.cookie("loginHash", null, { maxAge: -1 });
                res.cookie("userLogin", null, { maxAge: -1 });
                return res.redirect("/panel/login");
            } else {
                let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
                if(!["admin"].includes(userGroup[0][0].primary_group)) return res.redirect("/panel/event?type=AccessDenied");
                else return index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.params.login])
                    .then(async (accounts) => {
                        let playerGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [req.params.login.toLowerCase()]);
                        if(["admin"].includes(playerGroup[0][0].primary_group)) return res.redirect("/panel/event?type=AccessDenied");
                        else return res.render("panel/userEdit", { playerGroup: playerGroup, account: accounts[0][0], userLogin: req.cookies.userLogin || "Личный кабинет" });
                    }).catch(console.error);
            }
        }).catch(console.error);
});

router.post("/addUser", (req, res) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) return res.redirect("/");
            let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
            if(!["admin"].includes(userGroup[0][0].primary_group)) return res.redirect("/panel/event?type=AccessDenied");
            else return index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.body.login])
                .then((accounts) => {
                    if(accounts[0][0]) return res.redirect("/panel/admin");
                    else return index.mysql.promise().query("INSERT INTO accounts (login, pass) VALUES (?, MD5(?))", [req.body.login, req.body.pass])
                        .then(() => res.redirect("/panel/event?type=SuccessAddUser")).catch(console.error);
                }).catch(console.error);
        }).catch(console.error);
});

router.post("/editUser", (req, res) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) return res.redirect("/");
            let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
            if(!["admin"].includes(userGroup[0][0].primary_group)) return res.redirect("/panel/event?type=AccessDenied");
            else return index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.body.login])
                .then(async (accounts) => {
                    if(!accounts[0][0]) return res.redirect("/panel/admin");
                    let playerGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [req.body.login.toLowerCase()]);
                    if(!["admin"].includes(playerGroup[0][0].primary_group))
                        return index.mysql.promise().query("UPDATE accounts SET login = ?, pass = ?, balance = ?, uuid = ?, vk = ?, blocked = ? WHERE login = ?", [req.body.login, req.body.pass, req.body.balance, req.body.uuid, req.body.vk, req.body.blocked, req.body.login])
                            .then(() => {
                                // rcon.send(`kick ${accounts[0][0].login} @AccountEdited`);
                                return res.redirect("/panel/event?type=SuccessEditUser");
                            }).catch(console.error);
                    else
                        return res.redirect("/panel/event?type=AccessDenied");
                }).catch(console.error);
        }).catch(console.error);
});

router.get("/deleteUser", (req, res) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then(async (user) => {
            if(!user[0][0]) return res.redirect("/");
            let userGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [user[0][0].login.toLowerCase()]);
            if(!["admin"].includes(userGroup[0][0].primary_group)) return res.redirect("/panel/event?type=AccessDenied");
            else return index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.query.login])
                .then(async (accounts) => {
                    if(!accounts[0][0]) return res.redirect("/panel/admin");
                    else {
                        let playerGroup = await index.mysql.promise().query("SELECT * FROM luckperms_players WHERE username = ?", [req.query.login.toLowerCase()]);
                        if(!["admin"].includes(playerGroup[0][0].primary_group))
                            return index.mysql.promise().query("DELETE FROM accounts WHERE login = ?", [req.query.login])
                                .then(() => res.redirect("/panel/event?type=SuccessDeleteUser")).catch(console.error);
                        else
                            return res.redirect("/panel/event?type=AccessDenied");
                    }
                }).catch(console.error);
        }).catch(console.error);
});

router.get("/event", (req, res) => {
    res.render("panel/event", { type: eventProcess(req.query.type), userLogin: req.cookies.userLogin || "Личный кабинет" });
});

router.post("/skin", (req, res, next) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then((user) => {
            if(!user[0][0]) return res.redirect("/");
            else {
                uploadSkin(req, res, function (err) {
                    if(err) {
                        if (err instanceof multer.MulterError) {
                            console.error(err); // multer
                            res.status(500).render("error", { error: 500, errorProcessed: "Ошибка Multer. Обратитесь в нашу группу ВКонтакте.", userLogin: req.cookies.userLogin || "Личный кабинет" });
                        } else {
                            console.error(err); // not multer
                            res.status(500).render("error", { error: 500, errorProcessed: "Неизвестная ошибка. Обратитесь в нашу группу ВКонтакте.", userLogin: req.cookies.userLogin || "Личный кабинет" });
                        }
                    } else return index.mysql.promise().query("SELECT * FROM skins WHERE login = ?", [user[0][0].login])
                        .then((skin) => {
                            if(!skin[0][0]) return index.mysql.promise().query("INSERT INTO skins (hash, login) VALUES (?, ?)", [req.file.filename, user[0][0].login])
                                .then(() => {
                                    // rcon.send(`kick ${user[0][0].login} @SkinChanged`);
                                    return res.redirect("/panel/event?type=SuccessSkinChange");
                                }).catch(console.error);
                            else return index.mysql.promise().query("UPDATE skins SET hash = ? WHERE login = ?", [req.file.filename, user[0][0].login])
                                .then(() => {
                                    // rcon.send(`kick ${user[0][0].login} @SkinChanged`);
                                    res.redirect("/panel/event?type=SuccessSkinChange");
                                }).catch(console.error);
                        }).catch(console.error);
                });
            }
        }).catch(console.error);
});


router.post("/cloak", (req, res, next) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then((user) => {
            if(!user[0][0]) return res.redirect("/");
            else {
                uploadCloak(req, res, function (err) {
                    if(err) {
                        if (err instanceof multer.MulterError) {
                            console.error(err); // multer
                            res.status(500).render("error", { error: 500, errorProcessed: "Ошибка Multer. Обратитесь в нашу группу ВКонтакте.", userLogin: req.cookies.userLogin || "Личный кабинет" });
                        } else {
                            console.error(err); // not multer
                            res.status(500).render("error", { error: 500, errorProcessed: "Неизвестная ошибка. Обратитесь в нашу группу ВКонтакте.", userLogin: req.cookies.userLogin || "Личный кабинет" });
                        }
                    } else return index.mysql.promise().query("SELECT * FROM cloaks WHERE login = ?", [user[0][0].login])
                        .then((skin) => {
                            if(!skin[0][0]) return index.mysql.promise().query("INSERT INTO cloaks (hash, login) VALUES (?, ?)", [req.file.filename, user[0][0].login])
                                .then(() => {
                                    // rcon.send(`kick ${user[0][0].login} @CloakChanged`);
                                    res.redirect("/panel/event?type=SuccessCloakChange");
                                }).catch(console.error);
                            else return index.mysql.promise().query("UPDATE cloaks SET hash = ? WHERE login = ?", [req.file.filename, user[0][0].login])
                                .then(() => {
                                    // rcon.send(`kick ${user[0][0].login} @CloakChanged`);
                                    res.redirect("/panel/event?type=SuccessCloakChange");
                                }).catch(console.error);
                        }).catch(console.error);
                });
            }
        }).catch(console.error);
});

router.post("/password", (req, res) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then((user) => {
            if(!user[0][0]) return res.redirect("/");
            else {
                if(user[0][0].pass !== md5(req.body.passold)) return res.redirect("/panel/event?type=IncorrectPassword");
                else {
                    index.mysql.promise().query("UPDATE accounts SET pass = MD5(?) WHERE login = ?", [req.body.passnew, user[0][0].login]);
                    // rcon.send(`kick ${user[0][0].login} @PasswordChanged`);
                    return res.redirect("/panel/event?type=SuccessPasswordChange");
                }
            }
        }).catch(console.error);
});

router.get("/login", (req, res) => {
    if(req.cookies.loginHash) return res.redirect("/panel");
    else {
        if(req.query.error) return res.render("panel/login", { error: errorProcess(req.query.error), userLogin: req.cookies.userLogin || "Личный кабинет" });
        else return res.render("panel/login", { error: null, userLogin: req.cookies.userLogin || "Личный кабинет" });
    }
});

router.post("/login", (req, res) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.body.login])
        .then((user) => {
            if(!user[0][0]) return res.redirect("/panel/login?error=NotFound");
            else {
                if(user[0][0].pass !== md5(req.body.pass)) return res.redirect("/panel/login?error=IncorrectPassword");
                else {
                    if(user[0][0].blocked == 1) {
                       return res.redirect("/panel/login?error=Deactivated");
                    } else {
                        let hash = uuid.v4();
                        res.cookie("loginHash", hash, { maxAge: (86400 * 1000) });
                        res.cookie("userLogin", user[0][0].login, { maxAge: (86400 * 1000) });
                        index.mysql.promise().query("UPDATE accounts SET lk_cookie = ? WHERE login = ?", [hash, user[0][0].login]);
                        return res.redirect("/panel");
                    }
                }
            }
        }).catch(console.error);
});

router.get("/register", (req, res) => {
    if(req.cookies.loginHash) return res.redirect("/panel");
    else {
        if(req.query.error) return res.render("panel/register", { error: errorProcess(req.query.error), captcha: recaptcha.render(), userLogin: req.cookies.userLogin || "Личный кабинет" });
        else return res.render("panel/register", { error: null, captcha: recaptcha.render(), userLogin: req.cookies.userLogin || "Личный кабинет" });
    }
});

router.post("/register", recaptcha.middleware.verify, (req, res) => {
    index.mysql.promise().query("SELECT * FROM accounts WHERE login = ?", [req.body.login])
        .then((user) => {
            if(user[0][0]) return res.redirect("/panel/register?error=Found");
            if(!req.recaptcha.error) {
                let hash = uuid.v4();
                res.cookie("loginHash", hash, { maxAge: (86400 * 1000) });
                res.cookie("userLogin", req.body.login, { maxAge: (86400 * 1000) });
                index.mysql.promise().query("INSERT INTO accounts (login, pass, lk_cookie) VALUES (?, MD5(?), ?)", [req.body.login, req.body.pass, hash]);
                return res.redirect("/panel");
            } else return res.redirect("/panel/register?error=RecaptchaError");
        }).catch(console.error);
});

router.get("/logout", (req, res) => {
    if(!req.cookies.loginHash) return res.redirect("/panel/login");
    index.mysql.promise().query("SELECT * FROM accounts WHERE lk_cookie = ?", [req.cookies.loginHash])
        .then((user) => {
            if(!user[0][0]) return res.redirect("/panel/login");
            index.mysql.promise().query("UPDATE accounts SET lk_cookie = ? WHERE lk_cookie = ?", [null, req.cookies.loginHash])
                .catch(console.error);

            res.cookie("loginHash", null, { maxAge: -1 });
            res.cookie("userLogin", null, { maxAge: -1 });
            return res.redirect("/panel/login?error=Logout");
        }).catch(console.error);
});

router.use((req, res, next) => {
    res.status(404).render("error", { error: 404, errorProcessed: `Страница, которую вы ищите была <br>перемещена, удалена или её никогда <br> не существовало.`, userLogin: req.cookies.userLogin || "Личный кабинет" });
});

router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render("error", { error: 500, errorProcessed: "Произошла внутренняя ошибка сервера, <br> обратитесь в нашу группу ВКонтакте.", userLogin: req.cookies.userLogin || "Личный кабинет" });
});

module.exports = router;
