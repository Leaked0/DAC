import http from '../utils/request';

export default class {
    constructor(key) {
        this.key = key;
        this.session = http();
    }

    async getBalance() {
        const { json, body } = await this.session.get(`https://smspva.com/priemnik.php?metod=get_balance&apikey=${this.key}`);
        if (!json?.balance) throw Error(body);
        return json.balance;
    }

    async getNumber() {
        const { json, body } = await this.session.get(`https://smspva.com/priemnik.php?metod=get_service_price&service=opt45&apikey=${this.key}`);
        if (!json?.country) throw Error(body);
        const { json: json2, body: body2 } = await this.session.get(`https://smspva.com/priemnik.php?metod=get_number&country=${json.country}&service=opt45&apikey=${this.key}`);
        if (json2?.response === '2') throw Error('no available numbers');
        if (!json2?.number) throw Error(body2);
        this.id = json2.id;
        return `${json2.CountryCode}${json2.number}`;
    }

    async waitForCode() {
        let tries = 0;
        while (tries < 30) {
            tries += 1;
            const { json, body } = await this.session.get(`https://smspva.com/priemnik.php?metod=get_sms&id=${this.id}&service=opt45&apikey=${this.key}`);
            if (json?.response === '1') return json.sms;
            if (json?.response !== '2') throw Error(body);
            await new Promise((res) => setTimeout(res, 2000));
        }
        throw Error('sms verification time limit ran out');
    }

    async ban() {
        const { json, body } = await this.session.get(`https://smspva.com/priemnik.php?metod=ban&id=${this.id}&service=opt45&apikey=${this.key}`);
        if (json?.response !== '1') throw Error(body);
    }

    async cancel() {
        const { json, body } = await this.session.get(`https://smspva.com/priemnik.php?metod=denial&id=${this.id}&service=opt45&apikey=${this.key}`);
        if (json?.response !== '1') throw Error(body);
    }

    async done() {

    }
}
