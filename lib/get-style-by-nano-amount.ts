export interface StyleByAmount {
  color: number;
  lineWidth?: number;
  opacity?: number;
  colorClass?: string;
}

export const getStyleByNanoAmount = (amount: number) => {
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
      color: 0x1544bf,
      lineWidth: 2,
      hexColor: '#1544bf'
    };
  if (amount >= 100)
    return {
      color: 0x1a6dd4,
      lineWidth: 2,
      hexColor: '#1a6dd4'
    };
  if (amount >= 10)
    return {
      color: 0x209ce9,
      lineWidth: 2,
      hexColor: '#209ce9'
    };
  if (amount >= 1)
    return {
      color: 0x57f2f4,
      opacity: 0.6,
      hexColor: '#57f2f4'
    };
  if (amount >= 0.1)
    return {
      color: 0x91fbd5,
      opacity: 0.5,
      hexColor: '#A9A9A9'
    };
  return {
    color: 0xceffdb,
    opacity: 0.1,
    hexColor: '#808080'
  };
};
