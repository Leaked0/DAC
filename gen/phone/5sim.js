import http from '../utils/request';

export default class {
    constructor(key) {
        this.key = key;
        this.headers = {
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
        };
        this.session = http(undefined, this.headers);
    }

    async getBalance() {
        const { json: { balance } } = await this.session.get('https://5sim.net/v1/user/profile');
        return balance;
    }

    async getNumber() {
        const { json: { default_country: { name: country }, default_operator: { name: operator } } } = await this.session.get('https://5sim.net/v1/user/profile');

        let response;
        try {
            response = await this.session.get(`https://5sim.net/v1/user/buy/activation/russia/any/discord`);
        } catch (e) {
            throw new Error(e.response.body);
        }
        if (!response?.json?.phone) throw Error(response.body);
        const { json: { phone, id } } = response;
        this.id = id;
        return phone;
    }

    async waitForCode() {
        let tries = 0;
        while (tries < 30) {
            tries += 1;
            const { json } = await this.session.get(`https://5sim.net/v1/user/check/${this.id}`);
            if (json.sms.length > 0) return json.sms[0].code;
            await new Promise((res) => setTimeout(res, 2000));
        }
        throw Error('sms verification time limit ran out');
    }

    async ban() {
        return await this.session.get(`https://5sim.net/v1/user/ban/${this.id}`);
    }

    async cancel() {
        return await this.session.get(`https://5sim.net/v1/user/cancel/${this.id}`);
    }

    async done() {
        return await this.session.get(`https://5sim.net/v1/user/finish/${this.id}`);
    }
}
