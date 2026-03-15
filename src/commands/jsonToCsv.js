const fs = require("fs");
const fsPromises = require("fs").promises;
const { resolvePath } = require("../utils/pathResolver");

/**
 * @param {string} value
 * @returns {string}
 */
const escapeCsvField = (value) => {
  const str = String(value);
  if (/[,\n"]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/**
 *  arr of val to a CSV
 * @param {Array<string>} values
 * @returns {string}
 */
const rowToCsvLine = (values) => {
  return values.map(escapeCsvField).join(",") + "\n";
};

/**
 * Convert a JSON file (array of objects) to a CSV file using Streams
 * @param {string} currentDir
 * @param {string} inputPath
 * @param {string} outputPath
 * @returns {Promise<{ ok: boolean }>}
 */
const handleJsonToCsv = async (currentDir, inputPath, outputPath) => {
  const resolvedInput = resolvePath(currentDir, inputPath);
  const resolvedOutput = resolvePath(currentDir, outputPath);

  let data;
  try {
    await fsPromises.access(resolvedInput);
    const raw = await fsPromises.readFile(resolvedInput, "utf8");
    data = JSON.parse(raw);
  } catch {
    return { ok: false };
  }

  if (
    !Array.isArray(data) ||
    data.length === 0 ||
    typeof data[0] !== "object" ||
    data[0] === null
  ) {
    return { ok: false };
  }

  const headers = Object.keys(data[0]);
  const writeStream = fs.createWriteStream(resolvedOutput, {
    encoding: "utf8",
  });

  const waitDrain = () =>
    new Promise((resolve, reject) => {
      const onDrain = () => {
        writeStream.removeListener("error", onError);
        resolve();
      };
      const onError = (err) => {
        writeStream.removeListener("drain", onDrain);
        reject(err);
      };
      writeStream.once("drain", onDrain);
      writeStream.once("error", onError);
    });

  const waitFinish = () =>
    new Promise((resolve, reject) => {
      const onFinish = () => {
        writeStream.removeListener("error", onError);
        resolve();
      };
      const onError = (err) => {
        writeStream.removeListener("finish", onFinish);
        reject(err);
      };
      writeStream.once("finish", onFinish);
      writeStream.once("error", onError);
    });

  try {
    if (!writeStream.write(rowToCsvLine(headers))) {
      await waitDrain();
    }
    for (let i = 0; i < data.length; i++) {
      const row = headers.map((h) => data[i][h] ?? "");
      if (!writeStream.write(rowToCsvLine(row))) {
        await waitDrain();
      }
    }
    writeStream.end();
    await waitFinish();
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

module.exports = {
  handleJsonToCsv,
};
