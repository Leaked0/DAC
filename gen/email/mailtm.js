import MailJS from '@cemalgnlts/mailjs';

export default class {
    constructor() {
        this.email = new MailJS();
    }

    async getBalance() {
        return 'unlimited';
    }

    async getEmail() {
        const { data: { username } } = await this.email.createOneAccount();
        return username;
    }

    async waitForLink() {
        let tries = 0;
        while (tries < 30) {
            tries += 1;
            const { data: emails } = await this.email.getMessages();
            if (emails.length > 0 && emails[0].from.address === 'noreply@discord.com') {
                const { data: { text } } = await this.email.getMessage(emails[0].id);
                return text.match(/https:\/\/.+/)[0];
            }
            await new Promise((res) => setTimeout(res, 2000));
        }
        throw Error('email verification time limit ran out');
    }

    cancel() {

    }
}