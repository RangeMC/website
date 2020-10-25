<br />
<p align="center">
  <a href="https://rangemc.ovh">
    <img src="/static/img/icon.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Сайт RangeMC</h3>

  <p align="center">
    Полноценный сайт проекта на NodeJS 
    <br />

### Начало работы

Перед привязкой к БД, выполните в ней следующие запросы:
```sql
CREATE TABLE IF NOT EXISTS `accounts` ( 
`id` int(11) NOT NULL, 
`login` text NOT NULL, 
`pass` text NOT NULL, 
`vk` varchar(300) NOT NULL DEFAULT '0', 
`lk_cookie` text, 
`discord` text, 
`blocked` int(11) NOT NULL DEFAULT '0', 
`invited_by` int(11) DEFAULT NULL, 
`access` int(11) DEFAULT '0', 
`permission` int(11) NOT NULL DEFAULT '0', 
`uuid` char(36) DEFAULT NULL, 
`accessToken` char(32) DEFAULT NULL, 
`serverID` varchar(41) DEFAULT NULL, 
`hwid_id` bigint(20) DEFAULT NULL 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 

DELIMITER $$ 
CREATE TRIGGER IF NOT EXISTS `setUUID` BEFORE INSERT ON `accounts` FOR EACH ROW BEGIN 
IF NEW.uuid IS NULL THEN 
SET NEW.uuid = UUID(); 
END IF; 
END 
$$ 
DELIMITER ; 

CREATE TABLE IF NOT EXISTS `cloaks` ( 
`id` int(11) NOT NULL, 
`login` text, 
`hash` text 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; 

CREATE TABLE IF NOT EXISTS `skins` ( 
`id` int(11) NOT NULL, 
`login` text, 
`hash` text 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
После чего, вы можете создать новый аккаунт:
```sql
INSERT INTO accounts (login, pass) VALUES ('логин', 'пароль')
```

<!--- ## Начало работы

Здесь находятся инструкции по клонированию репозитория, настройке вебсервера и создания системного сервиса.

### Зависимости

1. Установите apache2
```sh
apt install apache2
```

1. Установите NodeJS
```sh
apt install nodejs
```

2. Обновите npm до последней версии
```sh
npm install npm@latest -g
```

### Установка

1. Перейдите в директорию /var/www/
```sh
cd /var/www/
```

1. Клонируйте репозиторий
```sh
git clone https://github.com/vlfz/rangemc.ovh.git
```

2. Установите зависимости через npm
```sh
npm install
```

3. Переименуйте файл .env.example в .env
```sh
cp .env.example .env
```

4. Заполните все данные в файле .env
```sh
nano .env
```

6. Запустите модули для ProxyPass
```sh
sudo a2enmod proxy
sudo a2enmod proxy_http
a2enmod proxy_balancer
a2enmod lbmethod_byrequests
systemctl restart apache2
```

5. Скопируйте и активируйте конфиг для apache2
```sh
cp rangemc.ovh.conf /etc/apache2/sites-available
a2ensite rangemc.ovh.conf
systemctl reload apache2
```

7. Скопируйте, активируйте и запустите сервис для systemd
```sh
cp rangemc.ovh.service /lib/systemd/system/
systemctl enable rangemc.ovh.service
systemctl start rangemc.ovh.service
```

## Известные проблемы

- Все проблемы устранены :)
-->

## Планируется сделать

- Обновить дизайн личного кабинета
- Добавить возможность донатить через Enot.io
- Вернуть API и адаптировать под новую систему прав
