/* eslint-disable no-mixed-operators */

// Sorry Airb'n'b I do know how to bitshift - disabling the nanny.
/* eslint-disable no-bitwise */

/**
 * Validate an IPv4 address fully
 * @param {string} ipAddress - the IP address to check
 */

function validateIpv4(ipAddress) {
    return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/.test(ipAddress);
}

/**
 * Validate a CIDR address and subnet (x.x.x.x/nn);
 * @param {string} subnet - the subnet to check
 */

function validateCidr(subnet) {
    return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))$/.test(subnet);
}

/**
 * Validate an address and subnet (x.x.x.x/n.n.n.n);
 * @param {string} subnet - the subnet to check
 */

function validateNetAndMask(subnet) {
    return /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/(([0-9]|[1-2][0-9]|3[0-2])|(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])))$/.test(subnet);
}

/**
 * Convert an ipAddress to a 32 bit integer
 * @param {string} ipaddress - ipAddress to convert
 */

function addressToInt(ipAddress) {
    if (!validateIpv4(ipAddress)) {
        return null;
    }
    const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ipAddress);

    if (octets && octets.length === 5) {
        // Return a 32 bit number representing the ip address
        // shift the octets leftwise by the required amount.
        return (octets[1] << 24) + (octets[2] << 16) + (octets[3] << 8) + (octets[4] << 0);
    }

    return null;
}

/**
 * Convert a 32 bit integer to an IP address
 * @param {integer} ipInt - the integer to convert
 */

function intToAddress(ipInt) {
    const val = [ipInt << 0 >>> 24, ipInt << 8 >>> 24, ipInt << 16 >>> 24, ipInt << 24 >>> 24].join('.');
    return validateIpv4(val) ? val : null;
}

/**
 * Convert a netmaks to the equivalent bit number
 * @param {string} mask - the netmask to convert
 */

function maskToBits(mask) {
    // Given a network mask - calculate the number of bits used to enable
    // an easy subnet calculation.

    if (!validateIpv4(mask)) {
        // If it's not a netmask - it might already be a bit count.
        if (parseInt(mask, 10) <= 32) {
            return parseInt(mask, 10);
        }

        return false;
    }

    let count = 0;
    let subnetInt = ~addressToInt(mask);

    // Anything < 0 is inherently an invalid subnet - return
    // a 0 bit mask.

    if (subnetInt < 0) {
        return false;
    }

    while (subnetInt !== 0) {
        count += 1;
        subnetInt >>= 1;
    }
    return 32 - count;
}

/**
 * Calculate subnet data for a subnet.
 * @param {string} subnet - subnet in either netmask or cidr format
 * @returns {object} subnetData - the subnet data
 */

function getSubnetData(subnet) {
    const subnetData = {};

    // See if the subnet is valid, if so process.
    if (!validateNetAndMask(subnet)) {
        return null;
    }

    const subnetMatchRe = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/((?:\d{1,2})|(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))$/;
    const subnetInfo = subnetMatchRe.exec(subnet);

    // Extract the subnet data.
    if (!subnetInfo || subnetInfo.length !== 3) {
        return subnetData;
    }

    const subnetAddress = subnetInfo[1];
    const subnetMask = maskToBits(subnetInfo[2]);

    // We may have been passed an IP with a CIDR rather than
    // a network with a CIDR. Work out the network address from
    // the IP/net address.

    const subnetInt = addressToInt(subnetAddress);
    if (subnetInt === false || subnetMask > 32) {
        return null;
    }

    let subnetMaskInt = -1 << 32 - subnetMask;
    let networkInt = subnetInt & subnetMaskInt;

    // If the subnet mask is 0 - return the "internet"
    if (subnetMask === 0) {
        subnetMaskInt = 0;
        networkInt = 0;
    }

    // Get the relevant data.
    // first address is always net address + 1
    // last is network + 2^(32-maskbits) -1
    // For netmask 1-31 the following is valid, for 32 it's a little different.
    // First address is the ip we were passed.
    // last address is the ip we were passed.
    // last host address is the ip we were passed.
    // i.e. a network of 1.

    let firstAddressInt;
    let lastAddressInt;
    let lastHostAddress;

    if (subnetMask >= 0 && subnetMask <= 31) {
        firstAddressInt = networkInt + 1;
        lastAddressInt = networkInt + (2 ** (32 - subnetMask) - 1);
        lastHostAddress = lastAddressInt - 1;
    }
    if (subnetMask === 32) {
        firstAddressInt = subnetInt;
        lastAddressInt = subnetInt;
        lastHostAddress = subnetInt;
    }

    const subnetReturn = {
        subnet: intToAddress(networkInt),
        firstHostAddress: intToAddress(firstAddressInt),
        lastHostAddress: intToAddress(lastHostAddress),
        broadcastAddress: intToAddress(lastAddressInt),
        subnetMask: intToAddress(subnetMaskInt),
        maskBits: subnetMask,
    };

    // Ensure we have valid data.

    if (subnetReturn
          && subnetReturn.subnet
          && subnetReturn.firstHostAddress
          && subnetReturn.lastHostAddress
          && subnetReturn.broadcastAddress
          && subnetReturn.subnetMask
          && subnetReturn.maskBits >= 0) {
        subnetReturn.subnetName = `${subnetReturn.subnet}/${subnetReturn.maskBits}`;
        return subnetReturn;
    }

    return null;
}

/**
 * Return true if the address is in the given subnet
 * @param {string} ipAddress - the ipAddress to check
 * @param {string} subnet - the subnet to check against
 */

function isInSubnet(ipAddress, subnet) {
    // See if the IP address is in the subnet.

    const ipInt = addressToInt(ipAddress);
    const subnetData = getSubnetData(subnet);
    const subnetNetInt = subnetData ? addressToInt(subnetData.subnet) : null;
    let subnetMaskInt;

    if (!subnetData || !subnetNetInt) {
        return false;
    }

    if (subnetData.maskBits === 0) {
        subnetMaskInt = 0;
    } else if (subnetData.maskBits === 32) {
        subnetMaskInt = -1;
    } else {
        subnetMaskInt = -1 << 32 - subnetData.maskBits;
    }

    if (subnetNetInt === false) {
        return false;
    }

    // See if the ip bitwise AND to the mask == the subnet Int.

    if (parseInt(ipInt & subnetMaskInt, 10) === parseInt(subnetNetInt, 10)) {
        return true;
    }

    return false;
}

/**
 * List the hosts in a range of IP addresses
 * @param {string} first - first address
 * @param {string} last - last address
 * */

function listHosts(first, last) {
    // return the host IP addresses.

    const addresses = [];
    let firstAsInt = addressToInt(first);
    const lastAsInt = addressToInt(last);
    if (!firstAsInt || !lastAsInt || lastAsInt < firstAsInt) {
        return addresses;
    }

    while (firstAsInt <= lastAsInt) {
        const address = intToAddress(firstAsInt);
        if (address) {
            addresses.push(address);
        }
        firstAsInt += 1;
    }
    return addresses;
}

/**
 * Export our functions
 */

module.exports = {
    isInSubnet,
    maskToBits,
    validateIpv4,
    validateCidr,
    validateNetAndMask,
    addressToInt,
    intToAddress,
    getSubnetData,
    listHosts,
};
