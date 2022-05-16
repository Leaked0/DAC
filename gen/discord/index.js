import crypto from 'crypto';
import http from '../utils/request';
import initializeGateway from './gateway';

export default class Discord {
    constructor(proxy, version) {
        const superProperties = Buffer.from(JSON.stringify({
            browser: 'Discord Android',
            browser_user_agent: `Discord-Android/${version}`,
            client_build_number: version,
            client_version: `${`${version}`.slice(0, 3)}.${parseInt(`${version}`.slice(3), 10)} - Stable`,
            device: 'RMX2063, RMX2063EEA',
            os: 'Android',
            os_sdk_version: '30',
            os_version: '11',
            system_locale: 'en-US',
            accessibility_support_enabled: false,
            accessibility_features: 256,
            device_advertiser_id: crypto.randomUUID(),
            client_performance_cpu: 16,
            client_performance_memory: Math.floor(Math.random() * (150000 - 80000 + 1)) + 80000,
            cpu_core_count: 4,
        })).toString('base64');
        this.session = http(proxy, {
            'User-Agent': `Discord-Android/${version}`,
            'X-Super-Properties': superProperties,
            'X-Discord-Locale': 'en-US',
            'Accept-Language': 'en-US',
            Connection: 'Keep-Alive',
            'Accept-Encoding': 'gzip',
        });
        this.proxy = proxy;
    }

    async getFingerprint() {
        const { json, body } = await this.session.get('https://discord.com/api/v9/experiments');
        if (!json) throw Error('failed to get fingerprint');
        this.fingerprint = json.fingerprint;
        this.session.updateHeaders({
            'X-Fingerprint': json.fingerprint,
        });
    }

    async getLocationData() {
        const { json } = await this.session.get('https://discord.com/api/v9/auth/location-metadata');
        return json;
    }

    async requestSMS(phone) {
        try {
            await this.session.post('https://discord.com/api/v9/auth/register/phone', {
                phone,
            });
            return { success: true };
        } catch (e) {
            if (e?.response?.json?.captcha_sitekey) {
                return { success: false, sitekey: e.response.json.captcha_sitekey };
            } else {
                throw e;
            }
        }
    }

    async requestSMSWithCaptcha(phone, captchaKey) {
        await this.session.post('https://discord.com/api/v9/auth/register/phone', {
            phone,
            captcha_key: captchaKey,
        });
    }

    async getPhoneToken(phone, smsCode) {
        const { json: { token } } = await this.session.post('https://discord.com/api/v9/phone-verifications/verify', {
            code: smsCode,
            phone,
        });
        return token;
    }

    async phoneRegister(phoneToken, dateOfBirth, username, password) {
        try {
            const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/register', {
                phone_token: phoneToken,
                consent: true,
                date_of_birth: dateOfBirth,
                fingerprint: this.fingerprint,
                password,
                username,
            });
            this.token = token;
            return { success: true, token };
        } catch (e) {
            if (e?.response?.json?.captcha_sitekey) {
                return { success: false, sitekey: e.response.json.captcha_sitekey };
            } else {
                throw e;
            }
        }
    }

    async phoneRegisterWithCaptcha(phoneToken, dateOfBirth, username, password, captchaKey) {
        const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/register/phone', {
            phone_token: phoneToken,
            consent: true,
            date_of_birth: dateOfBirth,
            fingerprint: this.fingerprint,
            password,
            username,
            captcha_key: captchaKey,
        });
        this.token = token;
        return token;
    }

    async emailRegister(emailAddress, dateOfBirth, username, password) {
        try {
            const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/register', {
                email: emailAddress,
                consent: true,
                date_of_birth: dateOfBirth,
                fingerprint: this.fingerprint,
                password,
                username,
            });
            this.token = token;
            return { success: true, token };
        } catch (e) {
            if (e?.response?.json?.captcha_sitekey) {
                return { success: false, sitekey: e.response.json.captcha_sitekey };
            } else {
                throw e;
            }
        }
    }

    async emailRegisterWithCaptcha(emailAddress, dateOfBirth, username, password, captchaKey) {
        const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/register', {
            email: emailAddress,
            consent: true,
            date_of_birth: dateOfBirth,
            fingerprint: this.fingerprint,
            password,
            username,
            captcha_key: captchaKey,
        });
        this.token = token;
        return token;
    }

    async nothingRegisterWithCaptcha(username, captchaKey, invite = null) {
        const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/register', {
            consent: true,
            fingerprint: this.fingerprint,
            username,
            captcha_key: captchaKey,
            invite: invite
        });
        this.token = token;
        return token;
    }

    async setEmail(email, password) {
        await this.session.patch('https://discord.com/api/v9/users/@me', {
            email,
            password,
            push_provider: 'gcm',
        }, {
            Authorization: this.token,
        });
    }

    async getEmailToken(link) {
        const response = await this.session.get(link, undefined, {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36',
        });
        return response.headers.Location.replace('https://discord.com/verify#token=', '');
    }

    async verifyEmail(emailToken) {
        try {
            const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/verify', {
                token: emailToken,
            }, {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36',
                Referer: 'https://discord.com/verify',
            });
            this.token = token;
            return { success: true, token };
        } catch (e) {
            if (e?.response?.json?.captcha_sitekey) {
                return { success: false, sitekey: e.response.json.captcha_sitekey };
            } else {
                throw e;
            }
        }
    }

    async verifyEmailWithCaptcha(emailToken, captchaKey) {
        const { json: { token } } = await this.session.post('https://discord.com/api/v9/auth/verify', {
            token: emailToken,
            captcha_key: captchaKey,
        }, {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36',
            Referer: 'https://discord.com/verify',
        });
        this.token = token;
        return token;
    }

    async checkAccount() {
        const { status } = await this.session.get('https://discord.com/api/v9/users/@me/affinities/users', undefined, {
            Authorization: this.token,
            Referer: 'https://discord.com/channels/@me',
        });
        if (status === 403) {
            throw Error('token locked');
        } else if (status === 401) {
            throw Error('token banned');
        } else if (status === 200) {
            return 'token is good';
        } else {
            throw Error(`unknown account check status code: ${status}`);
        }
    }

    async science(data) {
        const { status } = await this.session.post('https://discord.com/api/v9/science', data);
        return status;
    }

    async gateway() {
        return await initializeGateway(this.token, this.proxy);
    }
}
