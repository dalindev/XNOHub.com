export function parseBananoAmount(
  rawAmount: string,
  decimalPlaces: number = 6
): number {
  // Convert the raw amount to a BigInt
  const rawBigInt = BigInt(rawAmount);

  // Define the Banano unit (10^29) - Changed from Nano's 10^30
  const bananoUnit = BigInt('100000000000000000000000000000');

  // Perform the division
  const wholePart = rawBigInt / bananoUnit;
  const fractionalPart = rawBigInt % bananoUnit;

  // Convert to string and pad with zeros
  let fractionalString = fractionalPart.toString().padStart(29, '0'); // Changed from 30 to 29

  // Truncate to desired decimal places
  fractionalString = fractionalString.slice(0, decimalPlaces);

  // Combine whole and fractional parts
  const result = `${wholePart}.${fractionalString}`;

  // Remove trailing zeros and decimal point if necessary
  return parseFloat(result);
}
