export const prettyNumbers = (a: number, decimals = 6) => {
  if (a === null || a === undefined) return "--";

  const aStr = a.toString();

  if (aStr.includes(".")) {
    const b = aStr.split(".");
    return `${b[0]}.${(b[1] || "").slice(0, 6)}`;
  }

  return a.toString();
};
