import http from '../utils/request';

export default class {
    constructor(key) {
        this.key = key;
        this.session = http();
    }

    async getBalance() {
        const { body } = await this.session.get(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${this.key}&action=getBalance`);
        if (!body.includes('ACCESS_BALANCE')) throw Error(body);
        return parseFloat(body.replace('ACCESS_BALANCE:', ''));
    }

    async getNumber() {
        const country = 0;
        const { body } = await this.session.get(`https://sms-activate.org/stubs/handler_api.php?api_key=${this.key}&action=getNumber&service=ds&country=${country}`);
        if (!body.includes('ACCESS_NUMBER')) throw Error(body);
        const [id, phone] = body.replace('ACCESS_NUMBER:', '').split(':');
        this.id = id;
        return `+${phone}`;
    }

    async waitForCode() {
        let tries = 0;
        while (tries < 30) {
            tries += 1;
            const { body } = await this.session.get(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${this.key}&action=getStatus&id=${this.id}`);
            if (body.includes('STATUS_OK')) return body.replace('STATUS_OK:', '');
            if (!body.includes('WAIT')) throw Error(body);
            await new Promise((res) => setTimeout(res, 2000));
        }
        throw Error('sms verification time limit ran out');
    }

    async ban() {
        const status = 8;
        return await this.session.get(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${this.key}&action=setStatus&status=${status}&id=${this.id}`);
    }

    async cancel() {
        const status = 8;
        return await this.session.get(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${this.key}&action=setStatus&status=${status}&id=${this.id}`);
    }

    async done() {
        const status = 6;
        return await this.session.get(`https://api.sms-activate.org/stubs/handler_api.php?api_key=${this.key}&action=setStatus&status=${status}&id=${this.id}`);
    }
}
