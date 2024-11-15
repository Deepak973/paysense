export const truncateAddress = (address: string) => {
  if (!address) return "";
  const start = address.substring(0, 5);
  const end = address.substring(address.length - 3);
  return `${start}...${end}`;
};
