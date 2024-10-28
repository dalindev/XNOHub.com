export function bananoScaleRocketCount(amount: number): number {
  if (amount >= 10000000) {
    return 42;
  } else if (amount >= 3000000) {
    return 19;
  } else if (amount >= 1000000) {
    return 9;
  } else if (amount >= 100000) {
    return 6;
  } else if (amount >= 50000) {
    return 4;
  } else if (amount >= 5000) {
    return 2;
  } else if (amount >= 500) {
    return 1;
  } else {
    return 0;
  }
}
