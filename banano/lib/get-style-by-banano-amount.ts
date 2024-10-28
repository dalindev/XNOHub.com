export interface StyleByAmount {
  color: number;
  lineWidth?: number;
  opacity?: number;
  colorClass?: string;
}

export const getStyleByBananoAmount = (amount: number) => {
  if (amount >= 1000000)
    return {
      color: 0x800080, // Purple
      lineWidth: 5,
      hexColor: '#800080'
    };
  if (amount >= 100000)
    return {
      color: 0xff0000, // Red
      lineWidth: 4,
      hexColor: '#ff0000'
    };
  if (amount >= 10000)
    return {
      color: 0xff6b00, // Orange
      lineWidth: 3,
      hexColor: '#ff6b00'
    };
  if (amount >= 5000)
    return {
      color: 0xff9200, // Yellow
      lineWidth: 3,
      hexColor: '#ff9200'
    };
  if (amount >= 1000)
    return {
      color: 0xffe500,
      lineWidth: 2,
      hexColor: '#ffe500'
    };
  if (amount >= 500)
    return {
      color: 0x00ff00, // Bright green
      lineWidth: 2,
      hexColor: '#00ff00'
    };
  if (amount >= 100)
    return {
      color: 0x32cd32, // Lime green
      lineWidth: 2,
      hexColor: '#32cd32'
    };
  if (amount >= 10)
    return {
      color: 0x90ee90, // Light green
      opacity: 0.8,
      hexColor: '#90ee90'
    };
  if (amount >= 1)
    return {
      color: 0x91fbd5,
      opacity: 0.6,
      hexColor: '#A9A9A9'
    };
  return {
    color: 0xceffdb,
    opacity: 0.1,
    hexColor: '#808080'
  };
};
