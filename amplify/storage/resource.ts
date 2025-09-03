import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'griffins-recipes',
    access: (allow) => ({
        'recipe-data/*': [allow.authenticated.to(['read', 'write']), allow.guest.to(['read'])],
        'private-recipe-data/*': [allow.authenticated.to(['read', 'write'])],
    }),
});
