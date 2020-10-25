const Rcon = require("modern-rcon");
class RCON {
    constructor({ host, port, password }) {
        this.rcon = new Rcon(host, port = Number(port), password);
    }

    send(command) {
        return new Promise((resolve, reject) => 
            this.rcon.connect()
                .then(() => this.rcon.send(command))
                .then((response) => resolve(response))
                .then(() => this.rcon.disconnect())
        );
    }
}

module.exports = RCON;