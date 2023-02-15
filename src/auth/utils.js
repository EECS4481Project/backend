/**
 * Returns true if a given password meets the requirements. False otherwise.
 * - \>= 8 characters
 * - Contains 1+ lowercase
 * - Contains 1+ uppercase
 * - Contains 1+ number
 * - Contains 1+ symbols
 * @param {string} password password to verify
 * @return true if a given password meets the requirements. False otherwise.
 */
const checkPasswordRequirements = (password) => {
    lowercaseCount = 0;
    uppercaseCount = 0;
    numberCount = 0;
    symbolCount = 0;
    for (var i = 0; i < password.length; i++) {
        if (password.charCodeAt(i) >= 'a'.charCodeAt(0)
            && password.charCodeAt(i) <= 'z'.charCodeAt(0)) {
                lowercaseCount += 1;
        } else if (password.charCodeAt(i) >= 'A'.charCodeAt(0)
            && password.charCodeAt(i) <= 'Z'.charCodeAt(0)) {
                uppercaseCount += 1;
        } else if (password.charCodeAt(i) >= '0'.charCodeAt(0)
            && password.charCodeAt(i) <= '9'.charCodeAt(0)) {
                numberCount += 1;
        } else {
            symbolCount += 1;
        }
    }
    return lowercaseCount >= 1 && uppercaseCount >= 1 && numberCount >= 1
        && symbolCount >= 1 && password.length >= 8;
}

module.exports = {
    checkPasswordRequirements,
}