import { HCaptchaTask } from 'node-capmonster';

export default class {
    constructor(key, proxy) {
        this.key = key;
        this.capmonster = new HCaptchaTask(key);
        this.capmonster.setUserAgent('Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36');
        if (proxy && !proxy.includes('127.0.0.1')) {
            const parts = proxy.split('@');
            const [host, port] = parts.at(-1).split(':');
            let user; let pass;
            if (parts.length > 1) [user, pass] = parts[0].split(':');
            this.capmonster.setProxy('http', host, port, user, pass);
        }
    }

    async getBalance() {
        return await this.capmonster.getBalance();
    }

    async startSolving(url, sitekey) {
        this.taskId = await this.capmonster.createTask(url, sitekey);
        return this.taskId;
    }

    async waitForResponse() {
        const { gRecaptchaResponse } = await this.capmonster.joinTaskResult(this.taskId);
        return gRecaptchaResponse;
    }
}
