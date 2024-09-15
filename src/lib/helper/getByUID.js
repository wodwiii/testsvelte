import { auth } from "$lib/firebase/firebaseAdmin";

export async function getUserByUID(uid) {
    try {
        const user = await auth.getUser(uid);
        return { user, error: null };
    } catch (error) {
        console.error('Invalid UID:', error);
        return { user: null, error: 'Invalid UID' };
    }
}