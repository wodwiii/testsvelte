import { json } from '@sveltejs/kit';
import { verifyCheckoutUID } from '$lib/payment/checkout';
import { updateVerifiedList } from '$lib/payment/updateVerifiedList';

export async function GET({ url }) {
    const uid = url.searchParams.get('uid');

    if (!uid) {
        return json({ error: 'Missing UID' }, { status: 400 });
    }

    try {
        // Verify the checkout by UID
        const refId = await verifyCheckoutUID(uid);

        // Update the verified list
        await updateVerifiedList();

        // Return the refId as JSON
        return json({ refId }, { status: 200 });
    } catch (error) {
        const err = 'Error verifying checkout uid: ' + error.message;
        console.error(err);

        // Return the error message with status 500
        return json({ error: err }, { status: 500 });
    }
}
