/**
 * parse command line arguments
 * @param {string} line
 * @returns {{ command: string, args: string[], pathForCd?: string }}
 */
const parseInput = (line) => {
  const trimmed = line.trim();
  if (trimmed === "") {
    return { command: "", args: [] };
  }
  const parts = trimmed.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);
  let pathForCd =
    command === "cd" ? trimmed.slice(command.length).trim() : undefined;
  if (
    pathForCd &&
    ((pathForCd.startsWith('"') && pathForCd.endsWith('"')) ||
      (pathForCd.startsWith("'") && pathForCd.endsWith("'")))
  ) {
    pathForCd = pathForCd.slice(1, -1);
  }
  return {
    command,
    args,
    pathForCd,
  };
};

/**
 * parse --input and --output from command args (csv-to-json, json-to-csv, log-stats)
 * @param {string} rest - line after command name
 * @returns {{ input: string | null, output: string | null }}
 */
const parseInputOutputArgs = (rest) => {
  const input = rest.match(/--input\s+(?:"([^"]*)"|(\S+))/);
  const output = rest.match(/--output\s+(?:"([^"]*)"|(\S+))/);
  return {
    input: input ? (input[1] ?? input[2]) : null,
    output: output ? (output[1] ?? output[2]) : null,
  };
};

/**
 * parse --input from command args (count)
 * @param {string} rest - line after command name
 * @returns {{ input: string | null }}
 */
const parseCountArgs = (rest) => {
  const input = rest.match(/--input\s+(?:"([^"]*)"|(\S+))/);
  return {
    input: input ? (input[1] ?? input[2]) : null,
  };
};

/**
 * parse --input, --algorithm, --save from command args (hash)
 * @param {string} rest - line after command name
 * @returns {{ input: string | null, algorithm: string, save: boolean }}
 */
const parseHashArgs = (rest) => {
  const inputMatch = rest.match(/--input\s+(?:"([^"]*)"|(\S+))/);
  const algorithmMatch = rest.match(/--algorithm\s+(?:"([^"]*)"|(\S+))/);
  const save = /\b--save\b/.test(rest);
  const algorithmRaw = algorithmMatch
    ? (algorithmMatch[1] ?? algorithmMatch[2])
    : null;
  const algorithm = algorithmRaw ? algorithmRaw.toLowerCase() : "sha256";
  return {
    input: inputMatch ? (inputMatch[1] ?? inputMatch[2]) : null,
    algorithm,
    save,
  };
};

/**
 * parse --input, --hash, --algorithm from command args (hash-compare)
 * @param {string} rest - line after command name
 * @returns {{ input: string | null, hash: string | null, algorithm: string }}
 */
const parseHashCompareArgs = (rest) => {
  const inputMatch = rest.match(/--input\s+(?:"([^"]*)"|(\S+))/);
  const hashMatch = rest.match(/--hash\s+(?:"([^"]*)"|(\S+))/);
  const algorithmMatch = rest.match(/--algorithm\s+(?:"([^"]*)"|(\S+))/);
  const algorithmRaw = algorithmMatch
    ? (algorithmMatch[1] ?? algorithmMatch[2])
    : null;
  const algorithm = algorithmRaw ? algorithmRaw.toLowerCase() : "sha256";
  return {
    input: inputMatch ? (inputMatch[1] ?? inputMatch[2]) : null,
    hash: hashMatch ? (hashMatch[1] ?? hashMatch[2]) : null,
    algorithm,
  };
};

/**
 *parse --input, --output, --password from command args (encrypt, decrypt)
 * @param {string} rest - line after command name
 * @returns {{ input: string | null, output: string | null, password: string | null }}
 */
const parseEncryptArgs = (rest) => {
  const inputMatch = rest.match(/--input\s+(?:"([^"]*)"|(\S+))/);
  const outputMatch = rest.match(/--output\s+(?:"([^"]*)"|(\S+))/);
  const passwordMatch = rest.match(/--password\s+(?:"([^"]*)"|(\S+))/);
  return {
    input: inputMatch ? (inputMatch[1] ?? inputMatch[2]) : null,
    output: outputMatch ? (outputMatch[1] ?? outputMatch[2]) : null,
    password: passwordMatch ? (passwordMatch[1] ?? passwordMatch[2]) : null,
  };
};

module.exports = {
  parseInput,
  parseCsvToJsonArgs: parseInputOutputArgs,
  parseJsonToCsvArgs: parseInputOutputArgs,
  parseCountArgs,
  parseHashArgs,
  parseHashCompareArgs,
  parseEncryptArgs,
};
