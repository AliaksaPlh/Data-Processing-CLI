const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs").promises;
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");
const { resolvePath } = require("../utils/pathResolver");

const SALT_LEN = 16;
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const KEY_LEN = 32;
const PBKDF2_ITERATIONS = 100000;

/**
 *  derive a 32-byte key from password and salt
 * @param {string} password
 * @param {Buffer} salt
 * @returns {Buffer}
 */
const deriveKey = (password, salt) => {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LEN,
    "sha256",
  );
};

/**
 * сreate transform stream that encrypt data using AES-256-GCM
 * in flush function output cipher.final() and auth tag (16 bytes).
 * @param {Buffer} key
 * @param {Buffer} iv
 * @returns {Transform}
 */
const createEncryptTransform = (key, iv) => {
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LEN,
  });
  return new Transform({
    transform(chunk, encoding, callback) {
      this.push(cipher.update(chunk));
      callback();
    },
    flush(callback) {
      this.push(cipher.final());
      this.push(cipher.getAuthTag());
      callback();
    },
  });
};

/**
 * encrypt a file using AES-256-GCM with streams (no full file in memory)
 * uutput -  First 16 bytes: salt, Next 12 bytes: iv, Then: ciphertext, Last 16 bytes: authTag
 * @param {string} currentDir -  current work dir
 * @param {string} inputPath - path to input file (rel/abs)
 * @param {string} outputPath - path to output (rel/abs)
 * @param {string} password - password for key derivation
 * @returns {Promise<{ ok: boolean }>}
 */
const handleEncrypt = async (currentDir, inputPath, outputPath, password) => {
  const resolvedInput = resolvePath(currentDir, inputPath);
  const resolvedOutput = resolvePath(currentDir, outputPath);

  try {
    await fsPromises.access(resolvedInput);
  } catch {
    return { ok: false };
  }

  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const header = Buffer.concat([salt, iv]);

  const readStream = fs.createReadStream(resolvedInput);
  const encryptTransform = createEncryptTransform(key, iv);
  const writeStream = fs.createWriteStream(resolvedOutput);

  try {
    await new Promise((resolve, reject) => {
      writeStream.once("error", reject);
      writeStream.write(header, (err) => (err ? reject(err) : resolve()));
    });
    await pipeline(readStream, encryptTransform, writeStream);
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

module.exports = {
  handleEncrypt,
};
