import http from '../utils/request';

export default class {
    constructor(key) {
        this.key = key;
        this.session = http();
    }

    async getBalance() {
        const { json: { balance } } = await this.session.get(`http://api.kopeechka.store/user-balance?token=${this.key}&type=JSON&api=2.0`);
        return balance;
    }

    async getEmail() {
        const { json: { id, mail, status, value } } = await this.session.get(`http://api.kopeechka.store/mailbox-get-email?site=discord.com&mail_type=OUTLOOK&token=${this.key}&type=JSON&api=2.0`);
        if (status !== 'OK') throw Error(`email error - ${value}`);
        this.id = id;
        return mail;
    }

    async waitForLink() {
        let tries = 0;
        while (tries < 30) {
            tries += 1;
            const { json } = await this.session.get(`http://api.kopeechka.store/mailbox-get-message?id=${this.id}&token=${this.key}&type=JSON&api=2.0`);
            if (json.status === 'OK') {
                if (!json.value) {
                    if (json.fullmessage) {
                        const result = json.fullmessage.match(/redirectUrl=([^"]+)[^>]+>[ \n]*Verify Email/);
                        if (!result) throw Error(`email error - ${JSON.stringify(json)}`);
                        return decodeURIComponent(result[1]);
                    } else throw Error(`email error - ${JSON.stringify(json)}`);
                }
                return json.value;
            } else if (json.value !== 'WAIT_LINK') throw Error(`email error - ${json.value}`);
            await new Promise((res) => setTimeout(res, 2000));
        }
        throw Error('email verification time limit ran out');
    }

    async cancel() {
        await this.session.get(`http://api.kopeechka.store/mailbox-cancel?id=${this.id}&token=${this.key}&type=JSON&api=2.0`);
    }
}