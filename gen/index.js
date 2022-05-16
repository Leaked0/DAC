import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import rug from 'random-username-generator';
import rpg from 'secure-random-password';
import fs from 'fs';
import gplay from 'google-play-scraper';

import Discord from './discord';
import Phone from './phone';
import Captcha from './captcha';
import Email from './email';
import http from './utils/request';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const parseError = (e) => {
    let message;
    if (e?.response?.json?.message) {
        if (e.response.json.message.includes('Unauthorized')) message = 'account is banned';
        else {
            let info;
            const { errors } = e.response.json;
            if (errors) info = Object.values(errors).flatMap((x) => (x._errors ? x._errors.flatMap((y) => y.message || []) : [])).join(', ');
            message = `${e.response.json.message}${info ? ` - ${info}` : ''}`;
        }
        message = `${e.message.split('-')[0]}- ${message}`;
    } else {
        message = e?.message;
    }
    return message;
};

const { version: rawDiscordVersion } = await gplay.app({ appId: 'com.discord' });
const discordVersion = parseInt(rawDiscordVersion.split(' - ')[0].split('.').map((x) => x.padStart(3, '0')).join(''), 10);

export const phoneVerified = async (log, services, proxy) => {
    log(services.phone[1]);
    const discord = new Discord(proxy && `http://${proxy}`, discordVersion);
    const phone = Phone(services.phone[0], services.phone[1]);
    const captcha = Captcha(services.captcha[0], services.captcha[1], proxy);

    const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
    const between = (min, max) => `${Math.floor(Math.random() * (max - min + 1)) + min}`.padStart(2, '0');
    const dateOfBirth = `${between(1980, 2000)}-${between(1, 12)}-${between(1, 28)}`;
    const username = rug.generate().split('-').map(capitalize).join('').replace(' ', '');
    const password = rpg.randomPassword({ characters: [rpg.lower, rpg.upper, rpg.digits, rpg.symbols] });
    log(`generated user data: date of birth - ${dateOfBirth}, username - ${username}, password - ${password}`);

    await discord.getFingerprint();
    log('created discord session');
    log(`proxy country: ${(await discord.getLocationData()).country_code}`);

    let phoneToken;
    let retries = 0;
    let number;
    while (!phoneToken) {
        number = await phone.getNumber();
        log(`phone number: ${number}`);
        try {
            const { success: phoneSuccess, sitekey: phoneSitekey } = await discord.requestSMS(number);
            if (!phoneSuccess) {
                log(`waiting for captcha ${await captcha.startSolving(`https://${phoneSitekey}.android-sdk.hcaptcha.com`, phoneSitekey)}`);
                const captchaKey = await captcha.waitForResponse();
                await discord.requestSMSWithCaptcha(number, captchaKey);
            }
            log('waiting for sms verification code');
            const smsCode = await phone.waitForCode();
            log(`sms verification code: ${smsCode}`);
            phoneToken = await discord.getPhoneToken(number, smsCode);
            await phone.done();
        } catch (e) {
            const message = parseError(e)?.toLowerCase();
            if (message.includes('invalid phone number')) {
                await phone.ban();
                log(`reported phone number ${number} - ${message}`);
            } else {
                await phone.cancel();
                log(`canceled phone number ${number} - ${message}`);
            }
            if (retries > 2 || (!message.includes('invalid phone number') && !message.includes('time limit ran out'))) throw e;
            retries += 1;
            await sleep(3000);
        }
    }
    log(`phone verification token: ${phoneToken}`);

    let { success: registerSuccess, sitekey: registerSitekey, token } = await discord.phoneRegister(phoneToken, dateOfBirth, username, password);
    if (!registerSuccess) {
        log(`waiting for captcha ${await captcha.startSolving('https://discord.com/register', registerSitekey)}`);
        const captchaKey = await captcha.waitForResponse();
        token = await discord.phoneRegisterWithCaptcha(phoneToken, dateOfBirth, username, password, captchaKey);
    }
    log(`generated token: ${token}`);
    log(`account check: ${await discord.checkAccount()}`);
    log(`${number}:${username}:${password}:${token}`);
    return {
        number, username, password, token, discord,
    };
};

export const emailVerified = async (log, services, proxy) => {
    log(services.email[0]);
    const discord = new Discord(proxy && `http://${proxy}`, discordVersion);
    const email = Email(services.email[0], services.email[1]);
    const captcha = Captcha(services.captcha[0], services.captcha[1], proxy);

    const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
    const between = (min, max) => `${Math.floor(Math.random() * (max - min + 1)) + min}`.padStart(2, '0');
    const dateOfBirth = `${between(1980, 2000)}-${between(1, 12)}-${between(1, 28)}`;
    const username = rug.generate().split('-').map(capitalize).join('').replace(' ', '');
    const password = rpg.randomPassword({ characters: [rpg.lower, rpg.upper, rpg.digits, rpg.symbols] });
    log(`generated user data: date of birth - ${dateOfBirth}, username - ${username}, password - ${password}`);

    await discord.getFingerprint();
    log('created discord session');
    log(`proxy country: ${(await discord.getLocationData()).country_code}`);

    let retries = 0;
    let emailAddress;
    let verificationLink;
    while (true) {
        retries += 1;
        try {
            emailAddress = await email.getEmail();
            log(`email address: ${emailAddress}`);
            let { success: registerSuccess, sitekey: registerSitekey, token } = await discord.emailRegister(emailAddress, dateOfBirth, username, password);
            if(!registerSuccess){
                log(`waiting for captcha ${await captcha.startSolving('https://discord.com/verify', registerSitekey)}`);
                const captchaKey = await captcha.waitForResponse();
                token = await discord.emailRegisterWithCaptcha(emailAddress, dateOfBirth, username, password, captchaKey);
                log('requested email verification');
                verificationLink = await email.waitForLink();
                log(`email verification link: ${verificationLink}`);
                const emailToken = await discord.getEmailToken(verificationLink);
                log(`email verification token: ${emailToken}`);
                let { success: emailSuccess, sitekey: emailSitekey, token } = await discord.verifyEmail(emailToken);
                if (!emailSuccess) {
                    log(`waiting for captcha ${await captcha.startSolving('https://discord.com/verify', emailSitekey)}`);
                    const captchaKey = await captcha.waitForResponse();
                    token = await discord.verifyEmailWithCaptcha(emailToken, captchaKey);
                }
                email.success();
            }
            break;
        } catch (e) {
            await email.cancel();
            if (retries > 2) throw e;
            const message = parseError(e)?.toLowerCase();
            if (message.includes('email is already registered')) {
                log(`canceled ${emailAddress} - email is already registered`);
            } else if (message.includes('time limit ran out')) {
                log(`canceled ${emailAddress} - time limit ran out`);
            } else {
                throw e;
            }
        }
    }

    log(`generated token: ${token}`);

    fs.writeFileSync('email-verified.txt', `${number}:${username}:${password}:${token}\n`);

    log(`account check: ${await discord.checkAccount()}`);
    return {
        email: emailAddress, number, username, password, token,
    };
};

export const phoneAndEmailVerified = async (log, services, proxy) => {
    const captcha = Captcha(services.captcha[0], services.captcha[1], proxy);
    const email = Email(services.email[0], services.email[1]);
    const {
        number, username, password, discord, token: oldToken,
    } = await phoneVerified(log, services, proxy);
    fs.appendFileSync('results/backup.txt', `${number}:${username}:${password}:${oldToken}\n`);
    let retries = 0;
    let emailAddress;
    let verificationLink;
    while (true) {
        retries += 1;
        try {
            emailAddress = await email.getEmail();
            log(`email address: ${emailAddress}`);
            await discord.setEmail(emailAddress, password);
            log('requested email verification');
            verificationLink = await email.waitForLink();
            break;
        } catch (e) {
            await email.cancel();
            if (retries > 2) throw e;
            const message = parseError(e)?.toLowerCase();
            if (message.includes('email is already registered')) {
                log(`canceled ${emailAddress} - email is already registered`);
            } else if (message.includes('time limit ran out')) {
                log(`canceled ${emailAddress} - time limit ran out`);
            } else {
                throw e;
            }
        }
    }
    log(`email verification link: ${verificationLink}`);
    const emailToken = await discord.getEmailToken(verificationLink);
    log(`email verification token: ${emailToken}`);
    let { success: emailSuccess, sitekey: emailSitekey, token } = await discord.verifyEmail(emailToken);
    if (!emailSuccess) {
        log(`waiting for captcha ${await captcha.startSolving('https://discord.com/verify', emailSitekey)}`);
        const captchaKey = await captcha.waitForResponse();
        token = await discord.verifyEmailWithCaptcha(emailToken, captchaKey);
    }
    log(`generated token: ${token}`);

    const oldBackup = fs.readFileSync('results/backup.txt', 'utf-8');
    fs.writeFileSync('results/backup.txt', oldBackup.replace(`${number}:${username}:${password}:${oldToken}\n`, ''));

    log(`account check: ${await discord.checkAccount()}`);
    return {
        email: emailAddress, number, username, password, token,
    };
};

export const Nothing = async (log, services, proxy) => {
    log("Nothing");

    const sitekey = "4c672d35-0701-42b2-88c3-78380b0db560";
    var token;

    const discord = new Discord(proxy && `http://${proxy}`, discordVersion);
    const captcha = Captcha(services.captcha[0], services.captcha[1], proxy);

    const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
    const between = (min, max) => `${Math.floor(Math.random() * (max - min + 1)) + min}`.padStart(2, '0');
    const dateOfBirth = `${between(1980, 2000)}-${between(1, 12)}-${between(1, 28)}`;
    const username = rug.generate().split('-').map(capitalize).join('').replace(' ', '');
    const password = rpg.randomPassword({ characters: [rpg.lower, rpg.upper, rpg.digits, rpg.symbols] });
    log(`generated user data: date of birth - ${dateOfBirth}, username - ${username}, password - ${password}`);

    await discord.getFingerprint();
    log('created discord session');
    log(`proxy country: ${(await discord.getLocationData()).country_code}`);

    let retries = 0;
    let emailAddress;
    let verificationLink;
    while (true) {
        retries += 1;
        try {
            log(`waiting for captcha ${await captcha.startSolving('https://discord.com/verify', sitekey)}`);
                const captchaKey = await captcha.waitForResponse();
                token = await discord.nothingRegisterWithCaptcha(username, captchaKey, "Kn5hp2UNQB");
                fs.writeFileSync('nothing.txt', `${retries}:${username}:${token}\n`);
            break;
        } catch (e) {
            log(e);
        }
    }

    log(`generated token: ${token}`);

    log(`account check: ${await discord.checkAccount()}`);
    return {
        email: emailAddress, number, username, password, token,
    };
};

export default ({
    email, phone, captcha, threads: threadsNum, proxies, debug, proxyFormat,
}) => async (number, func) => {
    if (typeof proxies === 'string') {
        try {
            const file = fs.readFileSync(proxies, 'utf8');
            const unformatted = file.split('\n').map((line) => line.trim()).filter((line) => line);
            if (proxyFormat === 'user:pass@host:port') proxies = unformatted;
            else if (proxyFormat === 'host:port') proxies = unformatted;
            else if (proxyFormat === 'host:port:user:pass') {
                proxies = unformatted.map((proxy) => {
                    const [host, port, user, pass] = proxy.split(':');
                    return `${user}:${pass}@${host}:${port}`;
                });
            }
        } catch (e) {
            throw new Error('failed to open proxy file, does the file exist?');
        }
    }
    console.log(gradient.pastel.multiline(figlet.textSync(' DAC', { font: '3D-ASCII' })));
    const tokenIndexes = Array(number).fill().map((_, i) => i + 1);
    const results = {
        success: 0,
        fail: 0,
        errors: [],
    };
    const thread = async () => {
        while (tokenIndexes.length > 0) {
            const tokenIndex = tokenIndexes.shift();
            const time = () => chalk.gray('[') + chalk.hex('92ACE5')((new Date()).toLocaleTimeString()) + chalk.gray(']');
            const prefix = chalk.gray('[') + chalk.hex('92ACE5')(`${tokenIndex}`.padStart(`${number}`.length, '0')) + chalk.gray(']');
            try {
                const proxy = proxies[Math.floor(Math.random() * proxies.length)];
                if (proxy) {
                    const { body } = await http(`http://${proxy}`).get('https://api.ipify.org/');
                    const ip = body.trim();
                    console.log(`${time()} ${prefix} checked proxy: ${ip}`);
                }
                const log = (...args) => {
                    if (debug) console.log(time(), prefix, ...args);
                };
                const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
                const services = {
                    email: [email[0], randomEl(email[1])],
                    phone: [phone[0], randomEl(phone[1])],
                    captcha: [captcha[0], randomEl(captcha[1])],
                };
                const {
                    email: emailAddress, number: phoneNumber, password, token,
                } = await func(log, services, proxy);
                results.success += 1;

                const save = (filename, result) => {
                    fs.appendFileSync(`results/${filename}`, `${result}\n`);
                    console.log(time(), prefix, chalk.hex('77DD66')('success!', result));
                };

                if (emailAddress) {
                    if (phoneNumber) save('fully-verified.txt', `${emailAddress}:${password}:${token}`);
                    else save('email-verified.txt', `${emailAddress}:${password}:${token}`);
                } else if (phoneNumber) save('phone-verified.txt', `${phoneNumber}:${password}:${token}`);
                else throw Error('invalid return value');
            } catch (e) {
                console.log(time(), prefix, chalk.hex('FF6961')('fail!', parseError(e)?.toLowerCase()));
                results.fail += 1;
                results.errors.push(parseError(e)?.toLowerCase());
            }
        }
    };
    const threads = Array(threadsNum).fill().map(() => thread());
    await Promise.all(threads);
    return results;
};
