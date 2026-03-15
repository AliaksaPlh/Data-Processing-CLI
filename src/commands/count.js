const fs = require("fs");
const fsPromises = require("fs").promises;
const { resolvePath } = require("../utils/pathResolver");

/**
 * Count lines, words, and characters in the data stream -the complete file is not in memory
 * A word is any sequence of non-whitespace characters
 * @param {string} filePath - resolved path to the file
 * @returns {Promise<{ ok: boolean, lines?: number, words?: number, characters?: number }>}
 */
const countStream = (filePath) => {
  return new Promise((resolve) => {
    let lines = 0;
    let words = 0;
    let characters = 0;
    let lastWasWhitespace = true;

    const readStream = fs.createReadStream(filePath, { encoding: "utf8" });

    readStream.on("data", (chunk) => {
      for (let i = 0; i < chunk.length; i++) {
        const c = chunk[i];
        characters += 1;
        if (c === "\n") {
          lines += 1;
        }
        if (/\s/.test(c)) {
          lastWasWhitespace = true;
        } else {
          if (lastWasWhitespace) {
            words += 1;
          }
          lastWasWhitespace = false;
        }
      }
    });

    readStream.on("end", () => {
      resolve({ ok: true, lines, words, characters });
    });

    readStream.on("error", () => {
      resolve({ ok: false });
    });
  });
};

/**
 * Count lines, words, and characters in a file using streams.
 * @param {string} currentDir
 * @param {string} inputPath - path to input file (rel/abs)
 * @returns {Promise<{ ok: boolean, lines?: number, words?: number, characters?: number }>}
 */
const handleCount = async (currentDir, inputPath) => {
  const resolvedInput = resolvePath(currentDir, inputPath);
  try {
    await fsPromises.access(resolvedInput);
  } catch {
    return { ok: false };
  }
  return countStream(resolvedInput);
};

module.exports = {
  handleCount,
};
