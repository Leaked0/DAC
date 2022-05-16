import enquirer from 'enquirer';
import fs from 'fs';
import creator, * as types from './gen';

let config;
try {
    const file = fs.readFileSync('config.json', 'utf-8');
    config = JSON.parse(file);
} catch (e) {}
if (config) {
    const prompt = new enquirer.Toggle({
        message: 'Config file detected, would you like to use it or create a new one?',
        disabled: 'Use it.',
        enabled: 'Create a new one.',
    });

    const ignoreConfig = await prompt.run();
    if (ignoreConfig) config = false;
}
if (!config) {
    const questions = [
        {
            type: 'select',
            name: 'type',
            message: 'What type of tokens do you want to make?',
            choices: ['fully verified', 'phone verified', 'email verified', 'Nothing'],
        },
        {
            type: 'numeral',
            name: 'number',
            message: 'How many tokens do you want to create?',
        },
        {
            type: 'numeral',
            name: 'threads',
            message: 'How many threads should the gen run?',
        },
        {
            type: 'select',
            name: 'emailProvider',
            message: 'What email provider do you want to use?',
            choices: ['kopeechka', 'mailtm'],
        },
        {
            type: 'list',
            name: 'emailKey',
            message: 'What are your kopeechka provider api keys (comma-separated)?',
        },
        {
            type: 'select',
            name: 'phoneProvider',
            message: 'What phone provider do you want to use?',
            choices: ['5sim', 'sms-activate.org', 'smspva', 'activation.pw'],
        },
        {
            type: 'list',
            name: 'phoneKey',
            message: 'What are your phone provider api keys (comma-separated)?',
        },
        {
            type: 'select',
            name: 'captchaProvider',
            message: 'What captcha provider do you want to use?',
            choices: ['capmonster', 'bypass'],
        },
        {
            type: 'list',
            name: 'captchaKey',
            message: 'What are your captcha provider api keys (comma-separated, not required for bypass)?',
        },
        {
            type: 'select',
            name: 'proxies',
            message: 'Which file are your proxies in?',
            choices: fs.readdirSync('./').filter((file) => file.endsWith('.txt')),
        },
        {
            type: 'select',
            name: 'proxyFormat',
            message: 'Which format are your proxies in?',
            choices: ['user:pass@host:port', 'host:port', 'host:port:user:pass'],
        },
        {
            type: 'toggle',
            name: 'debug',
            message: 'Would you like to see the process of creating the token (this will spam the console with high thread counts)?',
            enabled: 'Yes',
            disabled: 'No',
        },
        {
            type: 'toggle',
            name: 'save',
            message: 'Do you want this config to be saved for later use?',
            enabled: 'Yes',
            disabled: 'No',
        },
    ];
    const answers = await enquirer.prompt(questions);
    if (answers.save) fs.writeFileSync('config.json', JSON.stringify(answers));
    config = answers;
}
console.clear();
const create = creator({
    email: [config.emailProvider, config.emailKey],
    phone: [config.phoneProvider, config.phoneKey],
    captcha: [config.captchaProvider, config.captchaKey],
    threads: config.threads,
    proxies: config.proxies,
    proxyFormat: config.proxyFormat,
    debug: config.debug,
});

const tokenTypes = {
    'fully verified': types.phoneAndEmailVerified,
    'phone verified': types.phoneVerified,
    'email verified': types.emailVerified,
    'Nothing': types.Nothing
};
const results = (await create(config.number, tokenTypes[config.type]));
const errors = {};
for (const num of results.errors) {
    errors[num] = errors[num] ? errors[num] + 1 : 1;
}
console.log('-'.repeat(60));
console.log(`out of ${config.number} tokens, ${results.success} were made successfully`);
console.log(`errors which caused the remaining ${results.fail} tokens to fail:`);
for (const error of Object.keys(errors)) {
    console.log(`   - ${error}: ${errors[error]}`);
}
process.exit();
