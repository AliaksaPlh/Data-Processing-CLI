/**
 * parse input into command and args
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
 * parse --input and --output from command args (csv-to-json, json-to-csv)
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

module.exports = {
  parseInput,
  parseCsvToJsonArgs: parseInputOutputArgs,
  parseJsonToCsvArgs: parseInputOutputArgs,
  parseCountArgs,
};
