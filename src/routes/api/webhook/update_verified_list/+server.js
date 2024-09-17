import { updateVerifiedList } from '$lib/payment/updateVerifiedList.js';
import { json } from '@sveltejs/kit';

export async function GET({url}){
    try {
        await updateVerifiedList();
        return json({ message: 'Verified list updated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error updating verified list:', error);
        return json({ error: 'Error updating verified list' }, { status: 500 });
    }
}