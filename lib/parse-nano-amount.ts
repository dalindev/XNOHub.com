export function parseNanoAmount(
  rawAmount: string,
  decimalPlaces: number = 6
): number {
  // Convert the raw amount to a BigInt
  const rawBigInt = BigInt(rawAmount);

  // Define the Nano unit (10^30)
  const nanoUnit = BigInt('1000000000000000000000000000000');

  // Perform the division
  const wholePart = rawBigInt / nanoUnit;
  const fractionalPart = rawBigInt % nanoUnit;

  // Convert to string and pad with zeros
  let fractionalString = fractionalPart.toString().padStart(30, '0');

  // Truncate to desired decimal places
  fractionalString = fractionalString.slice(0, decimalPlaces);

  // Combine whole and fractional parts
  const result = `${wholePart}.${fractionalString}`;

  // Remove trailing zeros and decimal point if necessary
  return parseFloat(result);
}
