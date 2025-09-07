import { AuthUser, getCurrentUser } from 'aws-amplify/auth';

export const UserDAO = {
    isAuthenticated(user?: AuthUser | null): boolean {
        return !!user?.signInDetails;
    },

    async getCurrentUser(): Promise<AuthUser | null> {
        try {
            const user = await getCurrentUser();
            console.log('Signed in');
            return user;
        } catch (e) {
            console.log(`Could not retrieve current user: ${e}`);
            return null;
        }
    },
};
