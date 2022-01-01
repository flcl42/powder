import { bytesToBase64, base64ToBytes } from "./base64-utils";

function getKeyMaterial(password: Uint8Array) {
    return crypto.subtle.importKey(
        "raw",
        password,
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
    );
}

let head = 0;
let version = 1;

export const isEncrypted = (data: string) => {
    try {
        return base64ToBytes(data)[0] === head;
    } catch {
        return false;
    }
};

export const encrypt = async (data: string, password: string) => {
    async function _encrypt(password: Uint8Array, data: Uint8Array, salt: Uint8Array, iv: Uint8Array) {
        let keyMaterial = await getKeyMaterial(password);
        let key = await crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                salt: salt,
                "iterations": 100,
                "hash": "SHA-256"
            },
            keyMaterial,
            { "name": "AES-GCM", "length": 256 },
            true,
            ["encrypt", "decrypt"]
        );

        return crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );
    }

    let salt = crypto.getRandomValues(new Uint8Array(12));
    let iv = crypto.getRandomValues(new Uint8Array(12));

    let encrypted = await _encrypt(
        new TextEncoder().encode(password),
        new TextEncoder().encode(data),
        salt,
        iv);
    let packaged = Uint8Array.from([head, version, ...salt, ...iv, ...new Uint8Array(encrypted)]);
    return bytesToBase64(packaged);
};

export const decrypt = async (data: string, password: string) => {
    async function _decrypt(password: Uint8Array, data: Uint8Array, salt: Uint8Array, iv: Uint8Array) {
        let keyMaterial = await getKeyMaterial(password);
        let key = await crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                salt: salt,
                "iterations": 100,
                "hash": "SHA-256"
            },
            keyMaterial,
            { "name": "AES-GCM", "length": 256 },
            true,
            ["encrypt", "decrypt"]
        );

        return crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );
    }

    function unpack(encryptedData: string) {
        let data = base64ToBytes(encryptedData);
        if (data[0] !== head || data.length < 12+12+1+1+1) {
            return null;
        }
        return {
            salt: data.subarray(2, 14),
            iv: data.subarray(14, 26),
            encrypted: data.subarray(26, data.length)
        };
    }

    let unpacked = unpack(data);
    if(unpacked === null){
        return null;
    }
    let decrypted = await _decrypt(new TextEncoder().encode(password), unpacked.encrypted, unpacked.salt, unpacked.iv);

    let result = new TextDecoder().decode(decrypted);
    let cat = result.indexOf('\0');
    return result.substring(0, cat !== -1 ? cat : undefined);
};
    