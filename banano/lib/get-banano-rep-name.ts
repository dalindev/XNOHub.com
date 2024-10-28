import { RepsData } from '@/banano/data/defualtMergedBananoRepsData';

export const getBananoRepName = (account: string) => {
  const rep = RepsData.find((rep) => rep.account === account);
  return rep ? rep.account_formatted : null;
};
