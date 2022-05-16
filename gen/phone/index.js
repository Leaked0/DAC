import FiveSim from './5sim';
import SmsActivateOrg from './sms-activateorg';
import Smspva from './smspva';
import ActivationPw from './activationpw';

const services = {
    '5sim': FiveSim,
    'sms-activate.org': SmsActivateOrg,
    smspva: Smspva,
    'activation.pw': ActivationPw,
};

/**
 * @typedef {Class} PhoneService
 * @property {string} key - Service api key
 * @property {function} getBalance - Get service credit balance
 * @property {function} getNumber - Get a phone number from the api
 * @property {function} waitForCode - Wait for the phone number to receive a code
 * @property {function} ban - Report the phone number didn't work
 * @property {function} done - Report the code was received successfully
 * @property {function} cancel - Cancel the phone number
 */

/**
 * Returns the specified phone api
 * @return {PhoneService} phone api
 */
export default (service, key, ...args) => {
    if (!services[service]) throw Error(`${service} is not supported`);
    return new services[service](key, ...args);
};
