import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'griffins-recipes',
    versioned: true,
    access: (allow) => ({
        'recipe-data/*': [allow.authenticated.to(['read', 'write', 'delete']), allow.guest.to(['read'])],
        'private-recipe-data/*': [allow.authenticated.to(['read', 'write', 'delete'])],
    }),
});
