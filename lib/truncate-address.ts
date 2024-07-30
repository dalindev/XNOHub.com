export const truncateAddress = (address: string) => {
  return `${address.slice(0, 10)}...${address.slice(-5)}`;
};
