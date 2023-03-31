import { uniqueNamesGenerator, Config, adjectives, names } from 'unique-names-generator';

const getConfig = (seed : string | number) => {
    const config : Config = {
        dictionaries: [adjectives, names],
        separator: '-',
        length: 2,
        seed: seed
    };
    return config;
};
  
export const getRandomName = (seed : number | string) => {
    return uniqueNamesGenerator(
        getConfig(seed)
    );
}