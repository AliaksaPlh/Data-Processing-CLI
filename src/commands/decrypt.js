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
 * Derive 32-byte key from password and salt (must match encrypt).
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
 * create transform stream that decrypt data using AES-256-GCM
 * @param {Buffer} key
 * @param {Buffer} iv
 * @param {Buffer} authTag
 * @returns {Transform}
 */
const createDecryptTransform = (key, iv, authTag) => {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LEN,
  });
  decipher.setAuthTag(authTag);
  return new Transform({
    transform(chunk, encoding, callback) {
      this.push(decipher.update(chunk));
      callback();
    },
    flush(callback) {
      try {
        this.push(decipher.final());
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
};

/**
 * Decrypt a file produced by encrypt - transfer only encrypted text (header and tag buffered)
 * @param {string} currentDir - current work dir
 * @param {string} inputPath - path to encrypted file (rel/abs)
 * @param {string} outputPath - path to output file (rel/abs)
 * @param {string} password - password for key derivation
 * @returns {Promise<{ ok: boolean }>}
 */
const handleDecrypt = async (currentDir, inputPath, outputPath, password) => {
  const resolvedInput = resolvePath(currentDir, inputPath);
  const resolvedOutput = resolvePath(currentDir, outputPath);

  let stat;
  try {
    await fsPromises.access(resolvedInput);
    stat = await fsPromises.stat(resolvedInput);
  } catch {
    return { ok: false };
  }

  const size = stat.size;
  if (size < SALT_LEN + IV_LEN + AUTH_TAG_LEN) {
    return { ok: false };
  }

  //parse salt (first 16 bytes) and iv (next 12 bytes), authTag (last 16 bytes)
  let headerBuf;
  let tagBuf;
  try {
    const fd = await fsPromises.open(resolvedInput, "r");
    headerBuf = Buffer.alloc(SALT_LEN + IV_LEN);
    await fd.read(headerBuf, 0, SALT_LEN + IV_LEN, 0);
    tagBuf = Buffer.alloc(AUTH_TAG_LEN);
    await fd.read(tagBuf, 0, AUTH_TAG_LEN, size - AUTH_TAG_LEN);
    await fd.close();
  } catch {
    return { ok: false };
  }

  const salt = headerBuf.subarray(0, SALT_LEN);
  const iv = headerBuf.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const key = deriveKey(password, salt);

  const ciphertextStream = fs.createReadStream(resolvedInput, {
    start: SALT_LEN + IV_LEN,
    end: size - AUTH_TAG_LEN - 1,
  });
  const decryptTransform = createDecryptTransform(key, iv, tagBuf);
  const writeStream = fs.createWriteStream(resolvedOutput);

  try {
    await pipeline(ciphertextStream, decryptTransform, writeStream);
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

module.exports = {
  handleDecrypt,
};
